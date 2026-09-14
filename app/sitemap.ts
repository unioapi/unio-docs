import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { absoluteDocsUrl, docsAlternates } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages();
  return pages.flatMap((page) => {
    const alternates = docsAlternates(page, pages);
    const url = absoluteDocsUrl(page.url);
    if (url !== alternates.canonical) return [];
    return [{ url, alternates: { languages: alternates.languages } }];
  });
}
