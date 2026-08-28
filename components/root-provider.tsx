"use client";

import { RootProvider as BaseRootProvider } from "fumadocs-ui/provider/next";
import type { ComponentProps } from "react";

// next-themes 0.4.6 在 React 19 / Next.js 16 下，客户端渲染防闪烁 <script> 会触发
// "Encountered a script tag while rendering React component" 报错
// （pacocoursey/next-themes#385，切换语言导致 [lang] 子树 remount 时必现）。
// 服务端保持原样输出（防闪烁脚本正常执行），客户端把 script type 改为
// application/json，React 不再将其视为可执行脚本，从而不报错。
const scriptProps =
  typeof window === "undefined"
    ? undefined
    : ({ type: "application/json" } as const);

export function RootProvider({
  theme,
  ...props
}: ComponentProps<typeof BaseRootProvider>) {
  return <BaseRootProvider {...props} theme={{ ...theme, scriptProps }} />;
}
