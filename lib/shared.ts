export const appName = "UnioAPI 文档";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

/** 文档站自身地址（canonical / sitemap 用），不要拿来当官网链接。 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://docs.unioapi.com";
/** 营销官网地址：顶栏「官网」链接跳这里。 */
export const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "https://unioapi.com";
export const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL ?? "https://console.unioapi.com";
export const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://api.unioapi.com";
