import type { Metadata } from 'next';
import { siteUrl, websiteUrl } from './shared';

export function isDocsLanguage(lang: string): lang is 'cn' | 'en' {
  return lang === 'cn' || lang === 'en';
}
export function docsLanguageTag(lang: string) {
  return lang === 'en' ? 'en' : 'zh-CN';
}
export function docsSiteName(lang: string) {
  return lang === 'en' ? 'UnioAPI Docs' : 'UnioAPI 文档';
}
export function absoluteDocsUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

type SeoPage = { slugs: string[]; url: string; locale?: string; path: string; data: { title: string; description?: string } };

export function docsSourcePage<T extends SeoPage>(page: T, pages: T[]): T {
  return pages.find((candidate) => candidate.slugs.join('/') === page.slugs.join('/') && candidate.path === page.path && candidate.locale === 'cn') ?? page;
}

export function docsAlternates(page: SeoPage, pages: SeoPage[]) {
  const translations = pages.filter((candidate) => candidate.slugs.join('/') === page.slugs.join('/'));
  // Missing English content falls back to the same Chinese source file.
  // Point duplicates to their source, and do not advertise them as translations.
  const original = docsSourcePage(page, translations);
  const languages: Record<string, string> = {};
  for (const candidate of translations) {
    const fallback = candidate.locale === 'en' && translations.some((other) => other.locale === 'cn' && other.path === candidate.path);
    if (!fallback && isDocsLanguage(candidate.locale ?? '')) languages[docsLanguageTag(candidate.locale!)] = absoluteDocsUrl(candidate.url);
  }
  if (languages['zh-CN']) languages['x-default'] = languages['zh-CN'];
  return { canonical: absoluteDocsUrl(original.url), languages };
}

export function createDocsMetadata(page: SeoPage, pages: SeoPage[], imagePath: string): Metadata {
  const lang = docsSourcePage(page, pages).locale ?? 'cn';
  const title = `${page.data.title} | ${docsSiteName(lang)}`;
  const alternates = docsAlternates(page, pages);
  const images = [{ url: absoluteDocsUrl(imagePath), width: 1200, height: 630, alt: title }];
  return {
    title: { absolute: title }, description: page.data.description, alternates,
    openGraph: { title, description: page.data.description, url: alternates.canonical, siteName: docsSiteName(lang), type: 'article', locale: lang === 'en' ? 'en_US' : 'zh_CN', images },
    twitter: { card: 'summary_large_image', title, description: page.data.description, images },
  };
}

export function docsJsonLd(page: SeoPage, pages: SeoPage[]) {
  const lang = docsSourcePage(page, pages).locale ?? 'cn';
  const url = docsAlternates(page, pages).canonical;
  const name = docsSiteName(lang);
  return {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'TechArticle', '@id': `${url}#article`, headline: page.data.title, description: page.data.description, url,
        inLanguage: docsLanguageTag(lang), isPartOf: { '@type': 'WebSite', name, url: siteUrl },
        publisher: { '@type': 'Organization', name: 'UnioAPI', url: websiteUrl } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name, item: absoluteDocsUrl(`/${lang}/docs`) },
        ...(page.slugs.length ? [{ '@type': 'ListItem', position: 2, name: page.data.title, item: url }] : []),
      ] },
    ],
  };
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
export function isIndexableHost(host: string | null) {
  return host?.toLowerCase() === 'docs.unioapi.com';
}

export function localizeDocsHref(href: string | undefined, lang: string) {
  return href && /^\/docs(?:\/|[?#]|$)/.test(href) ? `/${lang}${href}` : href;
}
