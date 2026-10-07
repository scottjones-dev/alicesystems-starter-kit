import { docsRoute } from "./shared";

/**
 * Pages are written with plain links (`/docs/packages/db`) so they do not depend on a language.
 * This adds the reader's language (`/es/docs/packages/db`) to those links, so a Spanish reader
 * stays in Spanish. Anything else (external links, anchors, links that already have a language)
 * is returned unchanged.
 */
export function localizeHref(
  href: string | undefined,
  lang: string
): string | undefined {
  if (href === undefined) {
    return href;
  }

  const startsWithDocs = href.startsWith(docsRoute);
  // The next character must end the path, so "/documents" is not a docs link.
  const nextChar = href.charAt(docsRoute.length);
  const isDocsLink = startsWithDocs && ["", "/", "?", "#"].includes(nextChar);

  if (isDocsLink) {
    return `/${lang}${href}`;
  }

  return href;
}
