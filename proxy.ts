import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { createI18nMiddleware, DefaultFormatter } from 'fumadocs-core/i18n/middleware';
import { docsContentRoute, docsRoute } from '@/lib/shared';
import { i18n } from '@/lib/i18n';

const i18nMiddleware = createI18nMiddleware(i18n);

// 语言偏好 cookie。
//
// 文档内容里大量内部链接是无前缀的 /docs/...，无前缀路径的重定向若只按
// Accept-Language 协商，正在读中文的用户（浏览器偏好英文）点一下链接就会被
// 切去英文。做法：带前缀的页面把当前语言记进 cookie，无前缀路径优先按 cookie
// 重定向，Accept-Language 只兜底首次访问。
//
// 用 cookie 而非 localStorage：重定向发生在服务端中间件，读不到 localStorage。
const LOCALE_COOKIE = 'FD_LOCALE';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
// 宽化成 string[]，方便对 URL/cookie 里的任意字符串做 includes 判断。
const locales: readonly string[] = i18n.languages;

// Markdown 协商：每种语言前缀各一组重写规则（两种语言都带前缀，见 lib/i18n.ts）。
const markdownRewrites = i18n.languages.map((lang) => `/${lang}`).flatMap((prefix) => {
  const { rewrite: rewriteDocs } = rewritePath(
    `${prefix}${docsRoute}{/*path}`,
    `${prefix}${docsContentRoute}{/*path}/content.md`,
  );
  const { rewrite: rewriteSuffix } = rewritePath(
    `${prefix}${docsRoute}{/*path}.md`,
    `${prefix}${docsContentRoute}{/*path}/content.md`,
  );

  return { rewriteDocs, rewriteSuffix };
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  for (const { rewriteDocs, rewriteSuffix } of markdownRewrites) {
    const suffixResult = rewriteSuffix(request.nextUrl.pathname);
    if (suffixResult) {
      return NextResponse.rewrite(new URL(suffixResult, request.nextUrl));
    }

    if (isMarkdownPreferred(request)) {
      const result = rewriteDocs(request.nextUrl.pathname);

      if (result) {
        return NextResponse.rewrite(new URL(result, request.nextUrl), {
          // this URL has two representations, selected by `Accept`
          headers: { Vary: 'Accept' },
        });
      }
    }
  }

  const url = request.nextUrl;
  const pathLocale = DefaultFormatter.get(url);

  // 已带语言前缀：放行并记住该语言。
  if (pathLocale && locales.includes(pathLocale)) {
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== pathLocale) {
      response.cookies.set(LOCALE_COOKIE, pathLocale, {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
    return response;
  }

  // 无前缀：优先跳回用户上次浏览的语言。
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return NextResponse.redirect(DefaultFormatter.add(url, cookieLocale));
  }

  // 首次访问（无 cookie）：交给 fumadocs 中间件按 Accept-Language 协商。
  return i18nMiddleware(request, event);
}

export const config = {
  // 忽略 API、静态资源、favicon（含深浅色两个 mark）与根级 llms 导出文件。
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|unio-mark.svg|unio-mark-white.svg|llms.txt|llms-full.txt).*)',
  ],
};
