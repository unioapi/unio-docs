import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "cn",
  languages: ["cn", "en"],
  // 默认语言（中文）不带 URL 前缀，英文在 /en 下。
  hideLocale: "default-locale",
});
