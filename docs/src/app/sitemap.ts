import type { MetadataRoute } from "next";
import { i18n } from "@/lib/i18n";
import { getTranslations, languageAlternates } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";
import { source } from "@/lib/source";

/**
 * Every page that really exists in a language, with links to its other languages. Pages with
 * no translation are not listed under that language: they would be copies of the original.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const absolute = (path: string) => new URL(path, siteUrl).href;

  const pages = source.getPages();

  // One entry per real version of a page, each listing the other languages.
  const docsEntries = pages
    .filter((page) =>
      getTranslations(pages, page.slugs, i18n.defaultLanguage).includes(page)
    )
    .map((page) => ({
      alternates: {
        languages: Object.fromEntries(
          Object.entries(
            languageAlternates(
              getTranslations(pages, page.slugs, i18n.defaultLanguage),
              i18n.defaultLanguage
            )
          ).map(([lang, url]) => [lang, absolute(url)])
        ),
      },
      url: absolute(page.url),
    }));

  return [{ url: absolute(`/${i18n.defaultLanguage}`) }, ...docsEntries];
}
