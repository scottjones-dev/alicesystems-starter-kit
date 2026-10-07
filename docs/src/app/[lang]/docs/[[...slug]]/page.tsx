import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBreadcrumb } from "@/components/docs-breadcrumb";
import { getMDXComponents } from "@/components/mdx";
import { i18n } from "@/lib/i18n";
import { pageAlternates } from "@/lib/seo";
import {
  getPageGithubUrl,
  getPageImageUrl,
  getPageMarkdownUrl,
} from "@/lib/shared";
import { source } from "@/lib/source";

export default async function Page(
  props: PageProps<"/[lang]/docs/[[...slug]]">
) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) {
    notFound();
  }

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      full={page.data.full}
      slots={{ breadcrumb: DocsBreadcrumb }}
      toc={page.data.toc}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          githubUrl={getPageGithubUrl(page)}
          markdownUrl={markdownUrl}
        />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  // With i18n this returns every language and slug.
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/[lang]/docs/[[...slug]]">
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) {
    notFound();
  }

  return {
    alternates: pageAlternates(page, source.getPages(), i18n.defaultLanguage),
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
    title: page.data.title,
  };
}
