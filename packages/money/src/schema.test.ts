import { describe, expect, it } from "vitest";

import { currencyCodeSchema, moneySchema } from "./schema";

describe("moneySchema", () => {
  it("accepts a whole amount and a currency code", () => {
    expect(moneySchema.parse({ amount: 1999, currency: "GBP" })).toStrictEqual({
      amount: 1999,
      currency: "GBP",
    });
  });

  it("rejects fractions, unsafe numbers, strings and bad currencies", () => {
    for (const bad of [
      { amount: 19.99, currency: "GBP" },
      { amount: 2 ** 53, currency: "GBP" },
      { amount: "1999", currency: "GBP" },
      { amount: 1, currency: "gbp" },
      { amount: 1 },
      { currency: "GBP" },
    ]) {
      expect(moneySchema.safeParse(bad).success, JSON.stringify(bad)).toBe(
        false
      );
    }
  });
});

describe("currencyCodeSchema", () => {
  it("accepts three capital letters only", () => {
    expect(currencyCodeSchema.safeParse("EUR").success).toBe(true);
    expect(currencyCodeSchema.safeParse("eur").success).toBe(false);
  });
});
