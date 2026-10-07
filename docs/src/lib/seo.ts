/** The parts of a docs page that the language rules below need. */
export interface PageRef {
  /** Missing when the site has no languages. */
  locale?: string;
  /** The source file, relative to the content folder. Two languages share it when one falls back. */
  path: string;
  slugs: readonly string[];
  url: string;
}

/**
 * The versions of a page that really exist: the default language, plus each language that has
 * its own file (`faq.es.mdx`). Fumadocs also creates a page for every other language that
 * points at the default file; those are copies, so they are left out. Listing them would put
 * six identical pages in the sitemap, competing with each other.
 */
export function getTranslations(
  pages: readonly PageRef[],
  slugs: readonly string[],
  defaultLanguage: string
): PageRef[] {
  const key = slugs.join("/");
  const group = pages.filter((page) => page.slugs.join("/") === key);
  const original = group.find((page) => page.locale === defaultLanguage);

  if (!original) {
    return [];
  }

  return group.filter(
    (page) => page === original || page.path !== original.path
  );
}

/**
 * The `hreflang` links for a page: one per language that really has the page, plus
 * `x-default` for visitors whose language is not covered, which is the default language.
 * Returns an empty object when the default language has no version, so no half-correct
 * set is published.
 */
export function languageAlternates(
  translations: readonly Pick<PageRef, "locale" | "url">[],
  defaultLanguage: string
): Record<string, string> {
  const fallback = translations.find(
    (translation) => translation.locale === defaultLanguage
  );

  if (!fallback) {
    return {};
  }

  const languages: Record<string, string> = {};
  for (const { locale, url } of translations) {
    if (locale) {
      languages[locale] = url;
    }
  }
  languages["x-default"] = fallback.url;

  return languages;
}

/**
 * The canonical link and `hreflang` links for a page being served. A language with no
 * translation is served the default page's content, so its canonical link points at the
 * original and search engines index one copy.
 */
export function pageAlternates(
  page: PageRef,
  allPages: readonly PageRef[],
  defaultLanguage: string
): { canonical: string; languages: Record<string, string> } {
  const translations = getTranslations(allPages, page.slugs, defaultLanguage);
  const original = translations.find(
    (translation) => translation.locale === defaultLanguage
  );
  const isRealVersion = translations.some(
    (translation) => translation.url === page.url
  );

  return {
    canonical: isRealVersion || !original ? page.url : original.url,
    languages: languageAlternates(translations, defaultLanguage),
  };
}
