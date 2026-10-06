import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatList,
  formatMoney,
  formatNumber,
  intlLocale,
} from "./format";

const MOMENT = new Date("2026-10-01T13:32:00Z");

describe("intlLocale", () => {
  it("gives English its regional flavour and other languages their own tag", () => {
    expect(intlLocale("en")).toBe("en-GB");
    expect(intlLocale("de-AT")).toBe("de");
    expect(intlLocale("zh-Hans-CN")).toBe("zh");
  });

  it("uses the default flavour for a language we do not ship, or no language", () => {
    expect(intlLocale("ja")).toBe("en-GB");
    expect(intlLocale(null)).toBe("en-GB");
    expect(intlLocale(undefined)).toBe("en-GB");
  });
});

describe("dates", () => {
  it("writes a date in the person's language", () => {
    expect(formatDate(MOMENT, "en", "UTC")).toBe("1 October 2026");
    expect(formatDate(MOMENT, "de", "UTC")).toBe("1. Oktober 2026");
    expect(formatDate(MOMENT, "fr", "UTC")).toBe("1 octobre 2026");
  });

  it("writes the time in 24 hours, in the time zone asked for", () => {
    expect(formatDateTime(MOMENT, "en", "UTC")).toContain("13:32");
    expect(formatDateTime(MOMENT, "en", "Europe/London")).toContain("14:32");
  });
});

describe("formatNumber", () => {
  it("uses the language's separators", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatNumber(1234.5, "de")).toBe("1.234,5");
  });
});

describe("formatMoney", () => {
  it("divides by the currency's own number of decimals", () => {
    expect(formatMoney(1999, "GBP", "en")).toBe("£19.99");
    expect(formatMoney(500, "JPY", "en")).toContain("500");
    expect(formatMoney(500, "JPY", "en")).not.toContain(".");
    expect(formatMoney(1234, "BHD", "en")).toContain("1.234");
  });

  it("writes the amount the way the language does", () => {
    expect(formatMoney(123_456, "EUR", "de")).toBe("1.234,56 €");
  });

  it("handles zero and negative amounts", () => {
    expect(formatMoney(0, "GBP", "en")).toBe("£0.00");
    expect(formatMoney(-250, "GBP", "en")).toBe("-£2.50");
  });

  it("refuses an amount that is not a whole number of minor units", () => {
    for (const bad of [19.99, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => formatMoney(bad, "GBP", "en")).toThrow("whole number");
    }
  });
});

describe("formatList", () => {
  it("joins with the right word for the language", () => {
    expect(formatList(["a", "b", "c"], "en")).toBe("a, b and c");
    expect(formatList(["a", "b", "c"], "de")).toBe("a, b und c");
  });
});
