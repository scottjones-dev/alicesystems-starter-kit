import { readFileSync } from "node:fs";
import path from "node:path";

import { app } from "@repo/config/app";
import { errorCodeNames } from "@repo/errors/codes";
import { describe, expect, it } from "vitest";
import type { LanguageCatalogs } from "./catalog-check";
import { checkAll, flatten } from "./catalog-check";
import { namespaces, resources } from "./resources";
import { buildResourcesSource, readListing } from "./resources-source";

/*
 * The real catalogs. The shipped translations are machine-written and have not been checked
 * by native speakers; these tests prove they are complete and consistent, not that they are
 * good.
 */

const root = path.resolve(import.meta.dirname, "..");
// SAFETY: the generated resources are plain nested JSON objects, which is what Catalog describes.
const catalogs = resources as Record<string, LanguageCatalogs>;

describe("the shipped catalogs", () => {
  it("are complete and consistent in every language (run `pnpm catalogs:check`)", () => {
    expect(
      checkAll(catalogs, app.i18n.locales, app.i18n.defaultLocale)
    ).toEqual([]);
  });

  it("have every namespace in every language", () => {
    for (const locale of app.i18n.locales) {
      expect(Object.keys(catalogs[locale] ?? {}).toSorted()).toEqual([
        ...namespaces,
      ]);
    }
  });

  it("have one error message for every error code, and none for codes that do not exist", () => {
    const keys = Object.keys(flatten(resources.en.errors)).toSorted();
    expect(keys).toEqual([...errorCodeNames].toSorted());
  });
});

describe("resources.ts", () => {
  it("is up to date with src/locales (run `pnpm catalogs:generate` if this fails)", () => {
    const expected = buildResourcesSource(
      readListing(path.join(root, "src", "locales"))
    );
    expect(readFileSync(path.join(root, "src", "resources.ts"), "utf-8")).toBe(
      expected
    );
  });
});

describe("languine.json", () => {
  const languine = JSON.parse(
    readFileSync(path.join(root, "languine.json"), "utf-8")
  ) as { locale: { source: string; targets: string[] } };

  it("translates from the default language into every other listed language", () => {
    expect(languine.locale.source).toBe(app.i18n.defaultLocale);
    expect(languine.locale.targets.toSorted()).toEqual(
      app.i18n.locales
        .filter((locale) => locale !== app.i18n.defaultLocale)
        .toSorted()
    );
  });
});
