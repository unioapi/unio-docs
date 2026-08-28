import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { docsContentRoute, docsRoute } from '@/lib/shared';
import { i18n } from '@/lib/i18n';

const i18nMiddleware = createI18nMiddleware(i18n);

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

  return i18nMiddleware(request, event);
}

export const config = {
  // 忽略 API、静态资源与根级 llms 导出文件。
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|llms.txt|llms-full.txt).*)'],
};
