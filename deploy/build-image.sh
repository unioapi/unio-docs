#!/usr/bin/env bash

# 按 deploy/VERSION 记录的版本构建本仓库的发布镜像。
#
# 与 unio-gateway/deploy/build-image.sh 同一套规则：
#   - 本地没有 <repository>:<tag> 镜像            → 构建，并把 tag / 当前 commit / UTC 时间写入 OCI Label；
#   - 已有镜像且其 revision Label == 当前 HEAD     → 跳过（幂等，可反复执行）；
#   - 已有镜像但 revision Label 是别的 commit      → 拒绝：同一个 tag 不能对应两个 commit，先在 VERSION 里提升版本。
#
# 前端产物与环境绑定（NEXT_PUBLIC_* / VITE_* 在构建期固化），但 tag 不带环境后缀：每台机器只构建、只运行自己
# 环境的镜像。烤入的公开地址来自 --env-file 指定的文件——即 unio-deploy 里该环境的 env/<service>.env，
# 通常由 unio-deploy/scripts/build.sh 调用本脚本并传入；仓库根目录的 .env 只给 bun dev 用，不参与构建
# （已被 .dockerignore 排除）。因此镜像内容 = commit + 部署清单里的 env 文件。
# 运行由 unio-deploy 仓库负责：把这里的 tag 写进 unio-deploy/environments/<env>/VERSION，再用它的 compose 起容器。

set -euo pipefail

# 本仓库的镜像在 VERSION 里的键前缀，以及要从 .env.docker 透传给 docker build 的基础镜像键。
image_key=DOCS_WEB
build_arg_keys=(BUN_IMAGE NODE_IMAGE)

fail() {
  echo "error: $*" >&2
  exit 1
}

usage() {
  cat >&2 <<'EOF'
Usage: ./deploy/build-image.sh --env-file <path>

  --env-file  烤进产物的公开地址（KEY=VALUE），通常是 unio-deploy/environments/<env>/<role>/env/<service>.env。
  按 deploy/VERSION 构建本仓库的镜像；已存在同 commit 的镜像时跳过。
EOF
}

# 从 KEY=VALUE 文件读取一个键；要求恰好出现一次且非空。
read_required_key() {
  local file="$1" key="$2" count value
  count="$(grep -c "^${key}=" "$file" || true)"
  [[ "$count" -eq 1 ]] || fail "$file must contain exactly one $key"
  value="$(sed -n "s/^${key}=//p" "$file")"
  [[ -n "$value" ]] || fail "$key in $file must not be empty"
  printf '%s' "$value"
}

app_env_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      [[ $# -ge 2 ]] || { usage; fail "--env-file needs a path"; }
      app_env_file="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage
      fail "unknown argument $1"
      ;;
  esac
done
[[ -n "$app_env_file" ]] || { usage; fail "--env-file is required (use unio-deploy/scripts/build.sh, or pass the env file explicitly)"; }
[[ -f "$app_env_file" ]] || fail "env file not found: $app_env_file"
app_env_file="$(cd "$(dirname "$app_env_file")" && pwd)/$(basename "$app_env_file")"

# ---------------------------------------------------------------------------
# 仓库与分支：只允许在 develop / main 的干净工作区构建，保证 tag ↔ commit 可追溯。
# ---------------------------------------------------------------------------
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null)" || fail "not inside a Git repository"
versions_file="$repo_root/deploy/VERSION"
docker_env_file="$repo_root/deploy/.env.docker"
dockerfile="$repo_root/deploy/Dockerfile"

current_branch="$(git -C "$repo_root" symbolic-ref --quiet --short HEAD 2>/dev/null)" || fail "detached HEAD is not allowed"
case "$current_branch" in
  develop | main) ;;
  *) fail "current branch $current_branch is not supported; use develop for test or main for prod" ;;
esac

if [[ -n "$(git -C "$repo_root" status --porcelain --untracked-files=normal)" ]]; then
  fail "working tree must be clean"
fi

[[ -f "$versions_file" ]] || fail "missing $versions_file"
[[ -f "$docker_env_file" ]] || fail "missing $docker_env_file (cp deploy/.env.docker.example deploy/.env.docker)"
[[ -f "$dockerfile" ]] || fail "missing $dockerfile"
command -v docker >/dev/null 2>&1 || fail "docker is required"

# ---------------------------------------------------------------------------
# VERSION：镜像名与版本。
# ---------------------------------------------------------------------------
repository="$(read_required_key "$versions_file" "${image_key}_IMAGE_REPOSITORY")"
tag="$(read_required_key "$versions_file" "${image_key}_IMAGE_TAG")"
if [[ ! "$tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
  fail "${image_key}_IMAGE_TAG=$tag in $versions_file is not a valid Docker image tag"
fi
image_ref="$repository:$tag"

# ---------------------------------------------------------------------------
# .env.docker：只放构建基础镜像。镜像名与版本只在 VERSION，残留会造成两处不一致，直接拒绝。
# ---------------------------------------------------------------------------
if stale_keys="$(grep -E '^[A-Z_]+_IMAGE_(TAG|REPOSITORY)=' "$docker_env_file")"; then
  fail "$docker_env_file still defines image names/versions; they live in $versions_file, remove these lines:"$'\n'"$stale_keys"
fi

build_args=()
for key in "${build_arg_keys[@]}"; do
  build_args+=(--build-arg "$key=$(read_required_key "$docker_env_file" "$key")")
done

# 公开地址文件以 BuildKit 命名上下文 appenv 传入，Dockerfile 里 COPY --from=appenv app.env ./.env.production。
# 不往仓库工作区写临时文件，保持"工作区干净"的前提成立。
appenv_dir="$(mktemp -d "${TMPDIR:-/tmp}/unio-appenv.XXXXXX")"
trap 'rm -rf "$appenv_dir"' EXIT
cp "$app_env_file" "$appenv_dir/app.env"

# ---------------------------------------------------------------------------
# 按需构建。
# ---------------------------------------------------------------------------
revision="$(git -C "$repo_root" rev-parse HEAD)"
created="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
label_format='{{index .Config.Labels "org.opencontainers.image.version"}}|{{index .Config.Labels "org.opencontainers.image.revision"}}|{{index .Config.Labels "org.opencontainers.image.created"}}'

if existing_metadata="$(docker image inspect --format "$label_format" "$image_ref" 2>/dev/null)"; then
  existing_revision="${existing_metadata#*|}"
  existing_revision="${existing_revision%%|*}"
  if [[ "$existing_revision" == "$revision" ]]; then
    printf 'branch:      %s\nrevision:    %s\nup to date (same revision, skipped):\n  %s\nnothing to build\n' \
      "$current_branch" "$revision" "$image_ref"
    exit 0
  fi
  fail "$image_ref already exists and was built from commit ${existing_revision:-unknown}, but HEAD is $revision; a tag must map to exactly one commit — bump ${image_key}_IMAGE_TAG in deploy/VERSION, commit, and retry"
fi

docker build \
  --file "$dockerfile" \
  --tag "$image_ref" \
  --build-context "appenv=$appenv_dir" \
  "${build_args[@]}" \
  --build-arg "IMAGE_VERSION=$tag" \
  --build-arg "IMAGE_REVISION=$revision" \
  --build-arg "IMAGE_CREATED=$created" \
  "$repo_root"

actual_metadata="$(docker image inspect --format "$label_format" "$image_ref")" || fail "cannot inspect built image $image_ref"
expected_metadata="${tag}|${revision}|${created}"
[[ "$actual_metadata" == "$expected_metadata" ]] || fail "built image metadata mismatch for $image_ref: expected $expected_metadata, got $actual_metadata"

printf 'branch:      %s\nrevision:    %s\ncreated:     %s\nenv file:    %s\nbuilt:\n  %s\nbaked public config:\n' \
  "$current_branch" "$revision" "$created" "$app_env_file" "$image_ref"
grep -Ev '^[[:space:]]*(#|$)' "$app_env_file" | sed 's/^/  /'
