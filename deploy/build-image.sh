#!/usr/bin/env bash

# 按 deploy/VERSION 记录的版本构建本仓库的发布镜像。
#
# 与 unio-gateway/deploy/build-image.sh 同一套规则：
#   - 本地没有 <repository>:<tag> 镜像            → 构建，并把 tag / 当前 commit / UTC 时间写入 OCI Label；
#   - 已有镜像且其 revision Label == 当前 HEAD     → 跳过（幂等，可反复执行）；
#   - 已有镜像但 revision Label 是别的 commit      → 拒绝：同一个 tag 不能对应两个 commit，先在 VERSION 里提升版本。
#
# 前端产物与环境绑定（NEXT_PUBLIC_* / VITE_* 在构建期固化），但 tag 不带环境后缀：每台机器只构建、只运行自己环境的
# 镜像，烤入哪份 .env.<环境> 由本机 deploy/env/.env.docker 的 BUILD_ENV 决定。因此镜像内容 = commit + 本机的 .env.<环境>。
# 运行由 unio-deploy 仓库负责：把这里的 tag 写进 unio-deploy/environments/<env>/VERSION，再用它的 compose 起容器。

set -euo pipefail

# 本仓库的镜像在 VERSION 里的键前缀，以及要从 .env.docker 透传给 docker build 的基础镜像键。
image_key=DOCS_WEB
build_arg_keys=(BUN_IMAGE NODE_IMAGE)

fail() {
  echo "error: $*" >&2
  exit 1
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

case "${1:-}" in
  -h | --help)
    echo "Usage: ./deploy/build-image.sh" >&2
    echo "  按 deploy/VERSION 构建本仓库的镜像；已存在同 commit 的镜像时跳过。" >&2
    exit 0
    ;;
  "") ;;
  *) fail "this script takes no arguments" ;;
esac

# ---------------------------------------------------------------------------
# 仓库与分支：只允许在 develop / main 的干净工作区构建，保证 tag ↔ commit 可追溯。
# ---------------------------------------------------------------------------
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null)" || fail "not inside a Git repository"
versions_file="$repo_root/deploy/VERSION"
docker_env_file="$repo_root/deploy/env/.env.docker"
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
[[ -f "$docker_env_file" ]] || fail "missing $docker_env_file (cp deploy/env/.env.docker.example deploy/env/.env.docker)"
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
# .env.docker：BUILD_ENV 与基础镜像。镜像名与版本只在 VERSION，残留会造成两处不一致，直接拒绝。
# ---------------------------------------------------------------------------
if stale_keys="$(grep -E '^[A-Z_]+_IMAGE_(TAG|REPOSITORY)=' "$docker_env_file")"; then
  fail "$docker_env_file still defines image names/versions; they live in $versions_file, remove these lines:"$'\n'"$stale_keys"
fi

build_env="$(read_required_key "$docker_env_file" BUILD_ENV)"
case "$build_env" in
  dev | test | prod) ;;
  *) fail "BUILD_ENV=$build_env in $docker_env_file must be dev, test or prod" ;;
esac
[[ -f "$repo_root/.env.$build_env" ]] || fail "missing $repo_root/.env.$build_env (BUILD_ENV=$build_env); it is gitignored and must be placed on this machine"

build_args=(--build-arg "BUILD_ENV=$build_env")
for key in "${build_arg_keys[@]}"; do
  build_args+=(--build-arg "$key=$(read_required_key "$docker_env_file" "$key")")
done

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
    printf 'branch:      %s\nrevision:    %s\nbuild env:   %s\nup to date (same revision, skipped):\n  %s\nnothing to build\n' \
      "$current_branch" "$revision" "$build_env" "$image_ref"
    exit 0
  fi
  fail "$image_ref already exists and was built from commit ${existing_revision:-unknown}, but HEAD is $revision; a tag must map to exactly one commit — bump ${image_key}_IMAGE_TAG in deploy/VERSION, commit, and retry"
fi

docker build \
  --file "$dockerfile" \
  --tag "$image_ref" \
  "${build_args[@]}" \
  --build-arg "IMAGE_VERSION=$tag" \
  --build-arg "IMAGE_REVISION=$revision" \
  --build-arg "IMAGE_CREATED=$created" \
  "$repo_root"

actual_metadata="$(docker image inspect --format "$label_format" "$image_ref")" || fail "cannot inspect built image $image_ref"
expected_metadata="${tag}|${revision}|${created}"
[[ "$actual_metadata" == "$expected_metadata" ]] || fail "built image metadata mismatch for $image_ref: expected $expected_metadata, got $actual_metadata"

printf 'branch:      %s\nrevision:    %s\ncreated:     %s\nbuild env:   %s\nbuilt:\n  %s\n' \
  "$current_branch" "$revision" "$created" "$build_env" "$image_ref"
