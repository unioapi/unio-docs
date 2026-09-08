# syntax=docker/dockerfile:1.7

# 基础镜像由 deploy/build-image.sh 从 deploy/env/.env.docker 传入；这里的默认值只是兜底。
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

# BUILD_ENV 决定烤进产物的 .env.<BUILD_ENV>（NEXT_PUBLIC_* 在构建期固化），由 build-image.sh 按本机 .env.docker 传入。
# 文档内容（content/）在构建期编译进产物。
ARG BUILD_ENV
ENV NEXT_TELEMETRY_DISABLED=1
RUN if [ -z "$BUILD_ENV" ]; then echo "build-arg BUILD_ENV is required (dev|test|prod)" >&2; exit 1; fi \
 && if [ ! -f ".env.$BUILD_ENV" ]; then echo ".env.$BUILD_ENV not found in build context" >&2; exit 1; fi \
 && bun run "build:$BUILD_ENV"

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
