import { defineI18n } from "fumadocs-core/i18n";

export const i18n = defineI18n({
  defaultLanguage: "cn",
  languages: ["cn", "en"],
  // 两种语言都带前缀：中文 /cn，英文 /en。
  //
  // 不用 hideLocale: "default-locale"（让中文无前缀）：那个模式靠 rewrite 把 /docs 补成
  // /cn/docs，再靠 redirect 把 /cn 去掉，两个分支的前提是 rewrite 不会让中间件二次执行。
  // Next 16 把 proxy 运行时从 Edge 换成 Node 后该前提不再成立，一次请求里两个分支同时触发，
  // 中文页全部滚成 ERR_TOO_MANY_REDIRECTS（英文页因为不走 redirect 分支反而正常）。
  // fumadocs 官方 i18n 示例也没启用它。
  //
  // 无前缀的旧链接不会 404：中间件会按 Accept-Language 重定向到对应语言前缀。
  hideLocale: "never",
});
