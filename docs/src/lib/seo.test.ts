import { describe, expect, it } from "vitest";
import {
  getTranslations,
  languageAlternates,
  type PageRef,
  pageAlternates,
} from "./seo";

const page = (locale: string, path: string, slugs = ["faq"]): PageRef => ({
  locale,
  path,
  slugs,
  url: `/${locale}/docs/${slugs.join("/")}`,
});

// English plus Spanish with its own file; German is only a fallback pointing at faq.mdx.
const english = page("en", "faq.mdx");
const spanish = page("es", "faq.es.mdx");
const germanFallback = page("de", "faq.mdx");
const allPages = [english, spanish, germanFallback];

describe("languageAlternates", () => {
  it("lists each language and points x-default at the default language", () => {
    expect(languageAlternates([english, spanish], "en")).toEqual({
      en: "/en/docs/faq",
      es: "/es/docs/faq",
      "x-default": "/en/docs/faq",
    });
  });

  it("works for a page that exists only in the default language", () => {
    expect(languageAlternates([english], "en")).toEqual({
      en: "/en/docs/faq",
      "x-default": "/en/docs/faq",
    });
  });

  it("returns nothing when the default language has no version", () => {
    expect(languageAlternates([spanish], "en")).toEqual({});
  });
});

describe("getTranslations", () => {
  it("keeps the original and real translations, and drops fallback copies", () => {
    expect(getTranslations(allPages, ["faq"], "en")).toEqual([
      english,
      spanish,
    ]);
  });

  it("ignores pages with other slugs", () => {
    const other = page("en", "setup/quickstart.mdx", ["setup", "quickstart"]);

    expect(getTranslations([...allPages, other], ["faq"], "en")).toEqual([
      english,
      spanish,
    ]);
  });

  it("returns nothing when there is no original", () => {
    expect(getTranslations([spanish], ["faq"], "en")).toEqual([]);
  });
});

describe("pageAlternates", () => {
  it("is its own canonical for the original and for a real translation", () => {
    expect(pageAlternates(english, allPages, "en").canonical).toBe(
      "/en/docs/faq"
    );
    expect(pageAlternates(spanish, allPages, "en").canonical).toBe(
      "/es/docs/faq"
    );
  });

  it("points a fallback page at the original and lists only real languages", () => {
    expect(pageAlternates(germanFallback, allPages, "en")).toEqual({
      canonical: "/en/docs/faq",
      languages: {
        en: "/en/docs/faq",
        es: "/es/docs/faq",
        "x-default": "/en/docs/faq",
      },
    });
  });

  it("keeps the page's own URL when there is no original to point at", () => {
    expect(pageAlternates(spanish, [spanish], "en")).toEqual({
      canonical: "/es/docs/faq",
      languages: {},
    });
  });
});
