import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildResourcesSource, readListing } from "./resources-source";

describe("buildResourcesSource", () => {
  const source = buildResourcesSource({
    en: ["common", "errors"],
    pl: ["errors", "common"],
  });

  it("imports every catalog file, in a fixed order", () => {
    const imports = source
      .split("\n")
      .filter((line) => line.startsWith("import "));
    expect(imports).toEqual([
      'import enCommon from "./locales/en/common.json";',
      'import enErrors from "./locales/en/errors.json";',
      'import plCommon from "./locales/pl/common.json";',
      'import plErrors from "./locales/pl/errors.json";',
    ]);
  });

  it("groups them by language and namespace", () => {
    expect(source).toContain(
      "  en: {\n    common: enCommon,\n    errors: enErrors,\n  },"
    );
    expect(source).toContain(
      "  pl: {\n    common: plCommon,\n    errors: plErrors,\n  },"
    );
  });

  it("lists each namespace once", () => {
    expect(source).toContain(
      'export const namespaces = ["common", "errors"] as const;'
    );
  });

  it("does not depend on the order of the input", () => {
    expect(
      buildResourcesSource({
        en: ["errors", "common"],
        pl: ["common", "errors"],
      })
    ).toBe(source);
  });

  it("refuses names that cannot be used as identifiers", () => {
    expect(() => buildResourcesSource({ en: ["bad-name"] })).toThrow(
      "cannot be used"
    );
    expect(() => buildResourcesSource({ "en-GB": ["common"] })).toThrow(
      "cannot be used"
    );
    expect(() => buildResourcesSource({ en: ["1common"] })).toThrow(
      "cannot be used"
    );
  });
});

describe("readListing", () => {
  it("reads locale folders and the JSON files in them, ignoring everything else", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "locales-"));
    try {
      mkdirSync(path.join(dir, "en"));
      mkdirSync(path.join(dir, "de"));
      writeFileSync(path.join(dir, "en", "common.json"), "{}");
      writeFileSync(path.join(dir, "en", "notes.txt"), "x");
      writeFileSync(path.join(dir, "de", "errors.json"), "{}");
      writeFileSync(path.join(dir, "README.md"), "x");
      expect(readListing(dir)).toEqual({ de: ["errors"], en: ["common"] });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
