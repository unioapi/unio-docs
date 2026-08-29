import { RootProvider } from "@/components/root-provider";
import { i18nProvider } from "fumadocs-ui/i18n";
import { translations } from "@/lib/layout.shared";
import "../global.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "UnioAPI 文档",
    template: "%s | UnioAPI 文档",
  },
  description: "UnioAPI 统一模型 API 接入文档：快速开始、客户端接入、SDK 示例与 API 参考。",
  // 浏览器标签图标跟随系统深浅色（与 admin/website 同一套 mark）。
  icons: {
    icon: [
      {
        url: "/unio-mark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/unio-mark-white.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;

  return (
    <html lang={lang === "en" ? "en" : "zh-CN"} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(translations, lang)}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
