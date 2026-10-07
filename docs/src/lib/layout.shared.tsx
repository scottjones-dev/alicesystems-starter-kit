import { uiTranslations } from "fumadocs-ui/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n, languageNames } from "./i18n";
import { appName, githubRepoUrl } from "./shared";

/**
 * The text Fumadocs shows around the content (search box, "Next page", ...). Only each
 * language's own name is set here; anything not translated falls back to English.
 */
export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add(
    Object.fromEntries(
      i18n.languages.map((lang) => [lang, { displayName: languageNames[lang] }])
    )
  );

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    githubUrl: githubRepoUrl,
    i18n: true,
    nav: {
      title: appName,
      url: `/${locale}`,
    },
  };
}
