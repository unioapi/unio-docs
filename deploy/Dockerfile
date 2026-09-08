# syntax=docker/dockerfile:1.7

# 基础镜像由 deploy/build-image.sh 从 deploy/.env.docker 传入；这里的默认值只是兜底。
ARG BUN_IMAGE=oven/bun:1.3.12-alpine
ARG NODE_IMAGE=node:24-alpine

# bun 只用来按 bun.lock 装依赖；构建与运行都用 node（Next.js 官方支持的运行时）。
FROM ${BUN_IMAGE} AS bun

FROM ${NODE_IMAGE} AS builder

WORKDIR /src

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .

# 烤进产物的公开地址（NEXT_PUBLIC_*）来自 unio-deploy 里该环境的 env/docs-web.env，由 build-image.sh 以
# --build-context appenv=<目录> 传入，落成 .env.production 供 next build 读取。仓库根目录的 .env 只给 bun dev 用，
# 已被 .dockerignore 排除，不会进镜像。文档内容（content/）也在构建期编译进产物。
COPY --from=appenv app.env ./.env.production
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM ${NODE_IMAGE} AS runtime

ARG IMAGE_VERSION=dev
ARG IMAGE_REVISION=unknown
ARG IMAGE_CREATED=unknown

LABEL org.opencontainers.image.title="Unio Docs" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.revision="${IMAGE_REVISION}" \
      org.opencontainers.image.created="${IMAGE_CREATED}"

RUN addgroup -S -g 65532 unio && adduser -S -D -H -u 65532 -G unio unio

WORKDIR /app

# standalone 产物自带精简过的 node_modules 与 server.js；static 与 public 要手动带上。
# ISR 再生会写 .next/server 与 .next/cache，所以属主是运行用户，容器不能用只读根文件系统。
# 注意 Next 会把 .env.production 一并复制进 standalone 目录，即 unio-deploy 的 env 文件会进运行时镜像——
# 这也是那些文件只能放公开地址、不能放密钥的原因之一。compose 以 env_file 注入的同名变量优先级更高。
COPY --from=builder --chown=unio:unio /src/.next/standalone ./
COPY --from=builder --chown=unio:unio /src/.next/static ./.next/static
COPY --from=builder --chown=unio:unio /src/public ./public

# Docker 默认把 HOSTNAME 设成容器 ID，Next 会拿它当监听地址；显式绑 0.0.0.0 让健康检查与端口发布都能连上。
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=18520

USER unio:unio

EXPOSE 18520

STOPSIGNAL SIGTERM

CMD ["node", "server.js"]
