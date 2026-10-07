import { app } from "@repo/config/app";
import { defineI18n } from "fumadocs-core/i18n";

/**
 * The docs languages are the template's languages (`app.i18n` in @repo/config), so there is one
 * list. Every URL starts with the language (`/en/docs/...`): `hideLocale: "never"`. A page with
 * no translation falls back to English, so a language can be added before it is fully written.
 */
export const i18n = defineI18n({
  defaultLanguage: app.i18n.defaultLocale,
  hideLocale: "never",
  languages: [...app.i18n.locales],
});

/** The name of each language written in itself, for the language switcher. */
export const languageNames = app.i18n.names;
