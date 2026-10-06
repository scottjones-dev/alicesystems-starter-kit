/*
 * The constants every workspace agrees on: the product's name, languages and links. It only
 * holds what is the SAME in every environment. Anything that differs between development,
 * staging and production (the web address, the API address) is an environment key in
 * `@repo/env`, never written here: a staging email must not link to production.
 *
 * Each platform changes the values below. Add a field when something reads it, not before.
 */
export const app = {
  api: {
    /** Where the API serves Better Auth and its own routes, under the API origin. */
    basePath: "/api",
  },
  description:
    "A starter app: replace this description with what your product does.",
  email: {
    /** The name shown in the From line. The address itself comes from the email sender. */
    fromName: "My App",
    replyTo: "support@example.com",
  },
  i18n: {
    /** Cookie that remembers the language of a signed-out visitor or a shared device. */
    cookie: "locale",
    defaultLocale: "en",
    locales: ["en"],
    /** Each language written in itself, for the language switcher. */
    names: { en: "English" },
  },
  /** Paths on the web app, and the support address. Emails turn paths into full links. */
  links: {
    privacy: "/privacy",
    support: "mailto:support@example.com",
    terms: "/terms",
  },
  /** Regional flavour for dates and numbers. Translations use the language codes above. */
  locale: "en-GB",
  name: "My App",
  /** Deep-link scheme of the native app, for redirects back into it (app.json "scheme"). */
  scheme: "myapp",
} as const;

export type App = typeof app;
export type Locale = (typeof app.i18n.locales)[number];
