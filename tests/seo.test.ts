import assert from 'node:assert/strict';
import { test } from 'node:test';
import { absoluteDocsUrl, createDocsMetadata, docsAlternates, docsJsonLd, isIndexableHost, localizeDocsHref, serializeJsonLd } from '../lib/seo';

const cn = { slugs: ['clients', 'example'], locale: 'cn', url: '/cn/docs/clients/example', path: 'clients/example.mdx', data: { title: '示例接入', description: '示例配置说明' } };
const en = { ...cn, locale: 'en', url: '/en/docs/clients/example', path: 'clients/example.en.mdx', data: { title: 'Example API Setup', description: 'Example integration guide' } };

test('translated pages have self canonical and reciprocal standard language tags', () => {
  for (const page of [cn, en]) {
    const alternates = docsAlternates(page, [cn, en]);
    assert.equal(alternates.canonical, absoluteDocsUrl(page.url));
    assert.deepEqual(alternates.languages, { 'zh-CN': absoluteDocsUrl(cn.url), en: absoluteDocsUrl(en.url), 'x-default': absoluteDocsUrl(cn.url) });
    assert.equal('cn' in alternates.languages, false);
  }
});

test('a fallback translation is canonicalized to its source and is not advertised as English', () => {
  const fallback = { ...cn, locale: 'en', url: en.url };
  assert.equal(docsAlternates(fallback, [cn, fallback]).canonical, absoluteDocsUrl(cn.url));
  assert.equal(docsAlternates(fallback, [cn, fallback]).languages.en, undefined);
  assert.equal((createDocsMetadata(fallback, [cn, fallback], '/en/og/docs/image.png').openGraph as { locale: string }).locale, 'zh_CN');
  assert.equal(docsJsonLd(fallback, [cn, fallback])['@graph'][0].inLanguage, 'zh-CN');
});

test('English and Chinese social previews have localized page titles and absolute image URLs', () => {
  const metadata = createDocsMetadata(en, [cn, en], '/en/og/docs/clients/example/image.png');
  assert.deepEqual(metadata.title, { absolute: 'Example API Setup | UnioAPI Docs' });
  assert.equal((metadata.openGraph as { locale: string }).locale, 'en_US');
  assert.equal((metadata.openGraph as { title: string }).title, (metadata.twitter as { title: string }).title);
  assert.match(String((metadata.openGraph as { images: { url: string }[] }).images[0].url), /^https?:\/\//);
  assert.deepEqual(createDocsMetadata(cn, [cn, en], '/cn/og/docs/image.png').title, { absolute: '示例接入 | UnioAPI 文档' });
});

test('internal content links stay in the current language without rewriting external links', () => {
  assert.equal(localizeDocsHref('/docs/api/models#list', 'cn'), '/cn/docs/api/models#list');
  assert.equal(localizeDocsHref('/docs?search=x', 'en'), '/en/docs?search=x');
  for (const href of [undefined, '#section', './models.mdx', '/en/docs', '/docs-other', 'https://example.test/docs']) assert.equal(localizeDocsHref(href, 'cn'), href);
});

test('article schema contains real content, no invented dates or ratings, and escapes script terminators', () => {
  const page = { ...en, data: { ...en.data, title: '</script><script>bad()</script>' } };
  const schema = docsJsonLd(page, [cn, page]);
  assert.equal(schema['@graph'][0]['@type'], 'TechArticle');
  assert.equal(schema['@graph'][0].inLanguage, 'en');
  assert.equal('dateModified' in schema['@graph'][0], false);
  const serialized = serializeJsonLd(schema);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.deepEqual(JSON.parse(serialized), schema);
});

test('test and local documentation hosts remain unindexable', () => {
  for (const host of [null, 'localhost:18520', 'test-docs.unioapi.com', 'docs.unioapi.com.evil.test']) assert.equal(isIndexableHost(host), false);
  assert.equal(isIndexableHost('docs.unioapi.com'), true);
});
