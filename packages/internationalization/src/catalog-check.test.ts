import { describe, expect, it } from "vitest";
import type { LanguageCatalogs } from "./catalog-check";
import {
  checkAll,
  checkLanguage,
  expectedKeys,
  flatten,
  placeholdersOf,
  pluralCategories,
} from "./catalog-check";

/*
 * These run against small made-up catalogs, so the checks are proven without shipping a
 * language just to test them (Polish has four plural forms, English two).
 */

const english = {
  common: {
    greeting: "Hello {{name}}",
    items_one: "{{count}} item",
    items_other: "{{count}} items",
    title: "Title",
  },
} satisfies LanguageCatalogs;

describe("flatten", () => {
  it("turns nested catalogs into dotted keys", () => {
    expect(flatten({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual({
      "a.b": "x",
      "a.c.d": "y",
      e: "z",
    });
  });
});

describe("placeholdersOf", () => {
  it("lists each {{name}} once, sorted, ignoring spaces", () => {
    expect(placeholdersOf("{{ b }} and {{a}} and {{b}}")).toEqual(["a", "b"]);
    expect(placeholdersOf("no placeholders")).toEqual([]);
  });
});

describe("plural forms", () => {
  it("knows how many forms each language needs", () => {
    expect(pluralCategories("en").toSorted()).toEqual(["one", "other"]);
    expect(pluralCategories("pl").toSorted()).toEqual([
      "few",
      "many",
      "one",
      "other",
    ]);
    expect(pluralCategories("zh")).toEqual(["other"]);
  });

  it("expects every plural form of the language, and plain keys as they are", () => {
    const source = flatten(english.common);
    expect(expectedKeys(source, "en")).toEqual([
      "greeting",
      "items_one",
      "items_other",
      "title",
    ]);
    expect(expectedKeys(source, "pl")).toEqual([
      "greeting",
      "items_few",
      "items_many",
      "items_one",
      "items_other",
      "title",
    ]);
    expect(expectedKeys(source, "zh")).toEqual([
      "greeting",
      "items_other",
      "title",
    ]);
  });
});

describe("checkLanguage", () => {
  const polish = {
    common: {
      greeting: "Cześć {{name}}",
      items_few: "{{count}} elementy",
      items_many: "{{count}} elementów",
      items_one: "{{count}} element",
      items_other: "{{count}} elementu",
      title: "Tytuł",
    },
  };

  it("accepts a complete translation with the plural forms of its language", () => {
    expect(checkLanguage("pl", english, polish)).toEqual([]);
  });

  it("reports a missing namespace", () => {
    expect(checkLanguage("pl", english, {})).toEqual([
      'pl: missing namespace "common"',
    ]);
  });

  it("reports a missing key and a missing plural form", () => {
    const { title: _title, items_few: _few, ...rest } = polish.common;
    expect(checkLanguage("pl", english, { common: rest })).toEqual([
      'pl/common: missing key "items_few"',
      'pl/common: missing key "title"',
    ]);
  });

  it("reports a key that is not in the default language", () => {
    const problems = checkLanguage("pl", english, {
      common: { ...polish.common, stray: "x" },
    });
    expect(problems).toEqual([
      'pl/common: "stray" is not in the default language',
    ]);
  });

  it("reports placeholders that differ, including on plural forms", () => {
    const problems = checkLanguage("pl", english, {
      common: {
        ...polish.common,
        greeting: "Cześć {{imie}}",
        items_few: "elementy",
      },
    });
    expect(problems).toEqual([
      'pl/common: "greeting": placeholders differ from the default language',
      'pl/common: "items_few": placeholders differ from the default language',
    ]);
  });

  it("reports empty text, markup and email addresses", () => {
    const problems = checkLanguage("pl", english, {
      common: {
        ...polish.common,
        greeting: "Cześć {{name}} <b>x</b>",
        items_one: "{{count}} a@b.co",
        title: "  ",
      },
    });
    expect(problems).toEqual([
      'pl/common: "greeting": contains markup; catalogs hold plain text',
      'pl/common: "items_one": contains an email address; catalogs hold no personal data',
      'pl/common: "title": empty translation',
    ]);
  });
});

describe("checkAll", () => {
  const catalogs = {
    en: english,
    zh: {
      common: {
        greeting: "你好 {{name}}",
        items_other: "{{count}} 项",
        title: "标题",
      },
    },
  };

  it("passes when every listed language is complete", () => {
    expect(checkAll(catalogs, ["en", "zh"], "en")).toEqual([]);
  });

  it("fails when a shipped language is not listed, or a listed one is not shipped", () => {
    expect(checkAll(catalogs, ["en"], "en")[0]).toContain(
      "differ from app.i18n.locales"
    );
    expect(checkAll(catalogs, ["en", "zh", "fr"], "en")[0]).toContain(
      "differ from app.i18n.locales"
    );
  });

  it("fails when there is no default language", () => {
    expect(checkAll({ zh: catalogs.zh }, ["zh"], "en")).toEqual([
      'no catalogs for the default language "en"',
    ]);
  });

  it("also checks the default language's own text", () => {
    const bad = { en: { common: { title: "<b>Bad</b>" } } };
    expect(checkAll(bad, ["en"], "en")).toEqual([
      'en/common: "title": contains markup; catalogs hold plain text',
    ]);
  });
});
