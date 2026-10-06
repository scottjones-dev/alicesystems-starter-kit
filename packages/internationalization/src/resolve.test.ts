import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  locales,
  parseAcceptLanguage,
  resolveLocale,
  toLocale,
} from "./resolve";

describe("toLocale", () => {
  it("keeps a language we ship", () => {
    for (const locale of locales) {
      expect(toLocale(locale)).toBe(locale);
    }
  });

  it("drops the region and any script, and ignores case and underscores", () => {
    expect(toLocale("es-MX")).toBe("es");
    expect(toLocale("EN_gb")).toBe("en");
    expect(toLocale("zh-Hans-CN")).toBe("zh");
    expect(toLocale("  de-AT ")).toBe("de");
  });

  it("returns undefined for a language we do not ship or for nonsense", () => {
    for (const input of ["ja", "tlh", "*", "", "123", "e", null, undefined]) {
      expect(toLocale(input)).toBeUndefined();
    }
  });
});

describe("parseAcceptLanguage", () => {
  it("returns the first shipped language in the browser's order", () => {
    expect(parseAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8")).toBe("fr");
  });

  it("follows the q weights, not the order written", () => {
    expect(parseAcceptLanguage("en;q=0.5, de;q=0.9")).toBe("de");
  });

  it("skips languages we do not ship", () => {
    expect(parseAcceptLanguage("ja, ko;q=0.9, pt-BR;q=0.8")).toBe("pt");
  });

  it("ignores a language the browser refuses (q=0) and a bad weight", () => {
    expect(parseAcceptLanguage("de;q=0, es;q=0.5")).toBe("es");
    expect(parseAcceptLanguage("de;q=oops, es;q=0.5")).toBe("es");
  });

  it("returns undefined when nothing matches or there is no header", () => {
    expect(parseAcceptLanguage("ja, ko")).toBeUndefined();
    expect(parseAcceptLanguage("*")).toBeUndefined();
    expect(parseAcceptLanguage(null)).toBeUndefined();
    expect(parseAcceptLanguage("")).toBeUndefined();
  });
});

describe("resolveLocale", () => {
  it("prefers the signed-in user's language over everything else", () => {
    expect(
      resolveLocale({
        acceptLanguage: "fr",
        cookie: "es",
        device: "zh",
        user: "de",
      })
    ).toBe("de");
  });

  it("then the cookie, then the browser, then the device", () => {
    expect(
      resolveLocale({ acceptLanguage: "fr", cookie: "es", device: "zh" })
    ).toBe("es");
    expect(resolveLocale({ acceptLanguage: "fr", device: "zh" })).toBe("fr");
    expect(resolveLocale({ device: "zh-CN" })).toBe("zh");
  });

  it("skips a choice we do not ship and falls through to the next", () => {
    expect(resolveLocale({ cookie: "ja", device: "pt", user: "xx" })).toBe(
      "pt"
    );
  });

  it("falls back to the default language", () => {
    expect(resolveLocale({})).toBe(defaultLocale);
    expect(resolveLocale({ cookie: "ja", user: null })).toBe(defaultLocale);
  });
});
