import { getPageImageUrl, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { createDocsMetadata, docsJsonLd, docsLanguageTag, docsSourcePage, localizeDocsHref, serializeJsonLd } from '@/lib/seo';

type DocsPageProps = {
  params: Promise<{ lang: string; slug?: string[] }>;
};

export default async function Page(props: DocsPageProps) {
  const { lang, slug } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;
  const RelativeLink = createRelativeLink(source, page);

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(docsJsonLd(page, source.getPages())) }} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
      </div>
      <DocsBody lang={docsLanguageTag(docsSourcePage(page, source.getPages()).locale ?? 'cn')}>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: ({ href, ...linkProps }) => <RelativeLink {...linkProps} href={localizeDocsHref(href, lang)} />,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: DocsPageProps): Promise<Metadata> {
  const { lang, slug } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  return createDocsMetadata(page, source.getPages(), getPageImageUrl(page).url);
}
