import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  abs,
  add,
  compare,
  equals,
  isNegative,
  isZero,
  money,
  multiply,
  negate,
  parseMajor,
  subtract,
  sum,
  toMajorString,
} from "./money";

const WHOLE_NUMBER = /whole number/u;
const NOT_A_CODE = /not a currency code/u;
const CANNOT_COMBINE = /Cannot combine/u;
const TOO_LARGE = /too large/u;
const GBP_EUR = /Cannot combine GBP and EUR/u;
const TWO_DECIMALS = /2 decimal places/u;
const ZERO_DECIMALS = /0 decimal places/u;
const NOT_AN_AMOUNT = /not an amount/u;

const gbp = (amount: number) => money(amount, "GBP");

/** Any amount that is safe to add two of without leaving the exact range. */
const smallAmount = fc.integer({ max: 2 ** 51, min: -(2 ** 51) });

describe("money", () => {
  it("makes an amount in whole minor units", () => {
    expect(gbp(1999)).toStrictEqual({ amount: 1999, currency: "GBP" });
  });

  it("refuses fractions, unsafe numbers and bad currencies", () => {
    expect(() => gbp(19.99)).toThrow(WHOLE_NUMBER);
    expect(() => gbp(Number.NaN)).toThrow(WHOLE_NUMBER);
    expect(() => gbp(2 ** 53)).toThrow(WHOLE_NUMBER);
    expect(() => money(1, "pounds")).toThrow(NOT_A_CODE);
  });

  it("never holds a negative zero", () => {
    expect(Object.is(gbp(-0).amount, 0)).toBe(true);
    expect(Object.is(negate(gbp(0)).amount, 0)).toBe(true);
  });
});

describe("arithmetic", () => {
  it("adds and subtracts exactly where floating point does not", () => {
    // In floating point 0.1 + 0.2 is 0.30000000000000004.
    expect(add(gbp(10), gbp(20))).toStrictEqual(gbp(30));
    expect(subtract(gbp(30), gbp(10))).toStrictEqual(gbp(20));
  });

  it("refuses to mix currencies", () => {
    expect(() => add(gbp(1), money(1, "EUR"))).toThrow(GBP_EUR);
    expect(() => subtract(gbp(1), money(1, "EUR"))).toThrow(CANNOT_COMBINE);
    expect(() => compare(gbp(1), money(1, "EUR"))).toThrow(CANNOT_COMBINE);
  });

  it("refuses a result that is too large to hold exactly", () => {
    expect(() => add(gbp(Number.MAX_SAFE_INTEGER), gbp(1))).toThrow(
      WHOLE_NUMBER
    );
    expect(() => multiply(gbp(2 ** 40), 2 ** 20)).toThrow(TOO_LARGE);
  });

  it("multiplies by a whole number only", () => {
    expect(multiply(gbp(250), 3)).toStrictEqual(gbp(750));
    expect(multiply(gbp(250), -2)).toStrictEqual(gbp(-500));
    expect(() => multiply(gbp(250), 1.5)).toThrow(WHOLE_NUMBER);
  });

  it("sums a list, and an empty list is zero in the stated currency", () => {
    expect(sum([gbp(1), gbp(2), gbp(3)], "GBP")).toStrictEqual(gbp(6));
    expect(sum([], "EUR")).toStrictEqual(money(0, "EUR"));
    expect(() => sum([gbp(1)], "EUR")).toThrow(CANNOT_COMBINE);
  });

  it("compares, and orders with sort", () => {
    expect(compare(gbp(1), gbp(2))).toBe(-1);
    expect(compare(gbp(2), gbp(2))).toBe(0);
    expect(compare(gbp(3), gbp(2))).toBe(1);
    expect([gbp(3), gbp(1), gbp(2)].sort(compare)).toStrictEqual([
      gbp(1),
      gbp(2),
      gbp(3),
    ]);
  });

  it("answers the simple questions", () => {
    expect(isZero(gbp(0))).toBe(true);
    expect(isNegative(gbp(-1))).toBe(true);
    expect(isNegative(gbp(1))).toBe(false);
    expect(abs(gbp(-5))).toStrictEqual(gbp(5));
    expect(equals(gbp(1), gbp(1))).toBe(true);
    expect(equals(gbp(1), money(1, "EUR"))).toBe(false);
  });

  it("negating twice, or adding then subtracting, gives back the start", () => {
    fc.assert(
      fc.property(smallAmount, smallAmount, (a, b) => {
        expect(negate(negate(gbp(a)))).toStrictEqual(gbp(a));
        expect(subtract(add(gbp(a), gbp(b)), gbp(b))).toStrictEqual(gbp(a));
      })
    );
  });

  it("adding is the same in either order and any grouping", () => {
    fc.assert(
      fc.property(smallAmount, smallAmount, smallAmount, (a, b, c) => {
        expect(add(gbp(a), gbp(b))).toStrictEqual(add(gbp(b), gbp(a)));
        expect(add(add(gbp(a), gbp(b)), gbp(c))).toStrictEqual(
          add(gbp(a), add(gbp(b), gbp(c)))
        );
      })
    );
  });
});

describe("parseMajor and toMajorString", () => {
  it.each([
    ["19.99", "GBP", 1999],
    ["19.9", "GBP", 1990],
    ["19", "GBP", 1900],
    ["0.05", "GBP", 5],
    ["-0.05", "GBP", -5],
    ["1999", "JPY", 1999],
    ["1.234", "BHD", 1234],
    ["  7.50 ", "GBP", 750],
  ])("reads %s %s", (text, currency, expected) => {
    expect(parseMajor(text, currency)).toStrictEqual(money(expected, currency));
  });

  it("does not turn 19.99 into 1998.9999999999998 the way floats do", () => {
    expect(parseMajor("19.99", "GBP").amount).toBe(1999);
    expect(19.99 * 100).not.toBe(1999);
  });

  it("refuses text that is not an amount, or has too many decimals, or is too big", () => {
    for (const bad of ["", "abc", "1,000.00", "1.", ".5", "1e3", "--1"]) {
      expect(() => parseMajor(bad, "GBP"), bad).toThrow(NOT_AN_AMOUNT);
    }
    expect(() => parseMajor("1.999", "GBP")).toThrow(TWO_DECIMALS);
    expect(() => parseMajor("1.5", "JPY")).toThrow(ZERO_DECIMALS);
    expect(() => parseMajor("99999999999999999999", "GBP")).toThrow(TOO_LARGE);
  });

  it.each([
    [1999, "GBP", "19.99"],
    [5, "GBP", "0.05"],
    [0, "GBP", "0.00"],
    [-5, "GBP", "-0.05"],
    [-123_456, "GBP", "-1234.56"],
    [1999, "JPY", "1999"],
    [1234, "BHD", "1.234"],
  ])("writes %s %s as %s", (amount, currency, expected) => {
    expect(toMajorString(money(amount, currency))).toBe(expected);
  });

  it("reads back what it writes, for every currency size", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 2 ** 52, min: -(2 ** 52) }),
        fc.constantFrom("GBP", "JPY", "BHD", "CLF"),
        (amount, currency) => {
          const original = money(amount, currency);

          expect(parseMajor(toMajorString(original), currency)).toStrictEqual(
            original
          );
        }
      )
    );
  });
});
