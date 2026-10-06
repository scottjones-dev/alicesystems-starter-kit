/*
 * Checks translation catalogs. Pure functions over the catalogs passed in (no files, no
 * bundled resources), so tests can run them against small made-up languages, and
 * `pnpm catalogs:check` runs them against the real ones.
 */

export interface Catalog {
  [key: string]: Catalog | string;
}

/** All catalogs of one language: namespace -> catalog. */
export type LanguageCatalogs = Record<string, Catalog>;

const PLURAL_SUFFIX = /_(?<category>zero|one|two|few|many|other)$/u;
const PLACEHOLDER = /\{\{(?<name>[^}]+)\}\}/gu;
const MARKUP = /<\/?[a-z][^>]*>/iu;
const EMAIL_ADDRESS = /[^\s@]+@[^\s@]+\.[^\s@]+/u;

/** `{ a: { b: "x" } }` becomes `{ "a.b": "x" }`. */
export const flatten = (
  catalog: Catalog,
  prefix = ""
): Record<string, string> => {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      flat[path] = value;
    } else {
      Object.assign(flat, flatten(value, path));
    }
  }
  return flat;
};

/** The `{{names}}` used in a string, sorted and without duplicates. */
export const placeholdersOf = (text: string): string[] =>
  [
    ...new Set(
      [...text.matchAll(PLACEHOLDER)].map(
        (match) => match.groups?.name?.trim() ?? ""
      )
    ),
  ].toSorted();

/** The plural forms a language needs: English one and other; Polish one, few, many and other. */
export const pluralCategories = (locale: string): string[] =>
  new Intl.PluralRules(locale).resolvedOptions().pluralCategories;

/**
 * Every key a complete translation must have. A plural message is written in English as
 * `key_one` and `key_other`; each language needs the forms its own grammar uses.
 */
export const expectedKeys = (
  english: Record<string, string>,
  locale: string
): string[] => {
  const keys = new Set<string>();
  for (const key of Object.keys(english)) {
    const base = key.replace(PLURAL_SUFFIX, "");
    if (base === key) {
      keys.add(key);
    } else {
      for (const category of pluralCategories(locale)) {
        keys.add(`${base}_${category}`);
      }
    }
  }
  return [...keys].toSorted();
};

/** The English text a translated key is compared against (plural forms compare with `_other`). */
const sourceKeyFor = (key: string, english: Record<string, string>) =>
  key in english ? key : key.replace(PLURAL_SUFFIX, "_other");

/** Problems in the text itself, whatever the language. */
const textProblems = (where: string, text: string): string[] => {
  const problems: string[] = [];
  if (text.trim() === "") {
    problems.push(`${where}: empty translation`);
  }
  if (MARKUP.test(text)) {
    problems.push(`${where}: contains markup; catalogs hold plain text`);
  }
  if (EMAIL_ADDRESS.test(text)) {
    problems.push(
      `${where}: contains an email address; catalogs hold no personal data`
    );
  }
  return problems;
};

/**
 * Everything wrong with one language compared with the default language: missing
 * namespaces, missing or stray keys (plural-aware), placeholders that do not match, empty
 * text, markup and email addresses.
 */
export const checkLanguage = (
  locale: string,
  english: LanguageCatalogs,
  translated: LanguageCatalogs
): string[] => {
  const problems: string[] = [];
  for (const [namespace, catalog] of Object.entries(english)) {
    const target = translated[namespace];
    if (!target) {
      problems.push(`${locale}: missing namespace "${namespace}"`);
      continue;
    }
    const source = flatten(catalog);
    const flat = flatten(target);
    const expected = new Set(expectedKeys(source, locale));

    for (const key of expected) {
      if (!(key in flat)) {
        problems.push(`${locale}/${namespace}: missing key "${key}"`);
      }
    }
    for (const [key, text] of Object.entries(flat)) {
      const where = `${locale}/${namespace}: "${key}"`;
      if (!expected.has(key)) {
        problems.push(`${where} is not in the default language`);
        continue;
      }
      problems.push(...textProblems(where, text));
      const sourceText = source[sourceKeyFor(key, source)] ?? "";
      if (
        placeholdersOf(text).join(",") !== placeholdersOf(sourceText).join(",")
      ) {
        problems.push(
          `${where}: placeholders differ from the default language`
        );
      }
    }
  }
  return problems;
};

/**
 * Checks every language in `catalogs` against the default one, and that the languages found
 * are exactly the ones the app lists, so a language cannot be shipped without being listed
 * (or listed without being shipped).
 */
export const checkAll = (
  catalogs: Record<string, LanguageCatalogs>,
  listedLocales: readonly string[],
  defaultLocale: string
): string[] => {
  const problems: string[] = [];
  const found = Object.keys(catalogs).toSorted();
  const listed = [...listedLocales].toSorted();
  if (found.join(",") !== listed.join(",")) {
    problems.push(
      `languages in src/locales (${found.join(", ")}) differ from app.i18n.locales (${listed.join(", ")})`
    );
  }
  const english = catalogs[defaultLocale];
  if (!english) {
    return [
      ...problems,
      `no catalogs for the default language "${defaultLocale}"`,
    ];
  }
  for (const locale of found) {
    if (locale !== defaultLocale) {
      problems.push(...checkLanguage(locale, english, catalogs[locale] ?? {}));
    }
  }
  for (const [namespace, catalog] of Object.entries(english)) {
    for (const [key, text] of Object.entries(flatten(catalog))) {
      problems.push(
        ...textProblems(`${defaultLocale}/${namespace}: "${key}"`, text)
      );
    }
  }
  return problems;
};
