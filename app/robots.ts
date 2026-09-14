import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { absoluteDocsUrl, isIndexableHost } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  return isIndexableHost((await headers()).get('host'))
    ? { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: absoluteDocsUrl('/sitemap.xml') }
    : { rules: { userAgent: '*', disallow: '/' } };
}
