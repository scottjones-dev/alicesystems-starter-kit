import { describe, expect, it } from "vitest";

import { decimalsOf, isCurrencyCode } from "./currency";

const NOT_A_CODE = /not a currency code/u;

describe("decimalsOf", () => {
  it("knows the common currencies", () => {
    expect(decimalsOf("GBP")).toBe(2);
    expect(decimalsOf("EUR")).toBe(2);
    expect(decimalsOf("JPY")).toBe(0);
    expect(decimalsOf("BHD")).toBe(3);
  });

  it("rejects anything that is not three capital letters", () => {
    for (const bad of ["gbp", "GB", "GBPP", "G1P", ""]) {
      expect(() => decimalsOf(bad)).toThrow(NOT_A_CODE);
      expect(isCurrencyCode(bad)).toBe(false);
    }
  });

  it("agrees with the runtime's list, except where the runtime follows display habit", () => {
    // Amounts are stored in the ISO 4217 minor unit, the one payment providers and banks use.
    // CLDR (what `Intl` reads) shows some currencies without decimals because nobody uses
    // the minor unit in shops (HUF, COP...), even though ISO and Stripe count 100 to the unit.
    // These are the known differences; any other difference is a typo or a change in the standard.
    const knownDisplayDifferences = new Set([
      "AFN",
      "ALL",
      "COP",
      "HUF",
      "IDR",
      "IQD",
      "IRR",
      "KPW",
      "LAK",
      "LBP",
      "MGA",
      "MMK",
      "PKR",
      "SLL",
      "SOS",
      "SYP",
      "YER",
    ]);
    for (const currency of Intl.supportedValuesOf("currency")) {
      if (knownDisplayDifferences.has(currency)) {
        continue;
      }
      const expected = new Intl.NumberFormat("en", {
        currency,
        style: "currency",
      }).resolvedOptions().maximumFractionDigits;

      expect(decimalsOf(currency), currency).toBe(expected);
    }
  });
});
