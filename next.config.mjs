import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // 容器镜像只带 .next/standalone（自含精简 node_modules 与 server.js），见 deploy/Dockerfile。
  output: 'standalone',
};

export default withMDX(config);
