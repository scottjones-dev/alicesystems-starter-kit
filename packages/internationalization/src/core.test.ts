import type { Resource } from "i18next";
import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";

import { getI18n, getT, i18nextOptions } from "./core";

describe("getT", () => {
  it("translates into the language asked for", () => {
    expect(getT("en", "errors")("NOT_FOUND")).toBe("We could not find that.");
    expect(getT("es", "errors")("NOT_FOUND")).toBe(
      "No hemos podido encontrarlo."
    );
    expect(getT("zh", "common")("actions.save")).toBe("保存");
  });

  it("accepts a region and any case", () => {
    expect(getT("de-AT", "common")("actions.cancel")).toBe("Abbrechen");
  });

  it("falls back to English for a language we do not ship or no language", () => {
    expect(getT("ja", "common")("actions.cancel")).toBe("Cancel");
    expect(getT(null, "common")("actions.cancel")).toBe("Cancel");
    expect(getT(undefined, "common")("actions.cancel")).toBe("Cancel");
  });

  it("reads each namespace from its own file", () => {
    expect(getT("fr", "common")("language.label")).toBe("Langue");
    expect(getT("fr", "errors")("UNAUTHORIZED")).toBe(
      "Veuillez vous connecter pour continuer."
    );
  });
});

describe("getI18n", () => {
  it("reuses one instance per language", () => {
    expect(getI18n("pt")).toBe(getI18n("pt-BR"));
    expect(getI18n("pt")).not.toBe(getI18n("de"));
  });
});

describe("i18nextOptions", () => {
  // The package types `t` from its own English catalogs, so a test that makes up keys talks
  // to the instance through a plain function type.
  type PlainT = (key: string, options?: Record<string, unknown>) => string;

  const withResources = async (resources: Resource): Promise<PlainT> => {
    const t = await createInstance().init({
      ...i18nextOptions("es"),
      ns: ["common"],
      resources,
    });
    // SAFETY: only the type is widened; the function is the same one.
    return t as unknown as PlainT;
  };

  it("falls back to the default language when a key is missing", async () => {
    const t = await withResources({
      en: { common: { a: "A", b: "B" } },
      es: { common: { a: "Á" } },
    });
    expect(t("a")).toBe("Á");
    expect(t("b")).toBe("B");
  });

  it("treats an empty translation as missing", async () => {
    const t = await withResources({
      en: { common: { a: "A" } },
      es: { common: { a: "" } },
    });
    expect(t("a")).toBe("A");
  });

  it("does not escape HTML, because React already does", async () => {
    const t = await withResources({
      en: { common: { greeting: "Hi {{name}}" } },
      es: { common: {} },
    });
    expect(t("greeting", { name: "A & B" })).toBe("Hi A & B");
  });
});
