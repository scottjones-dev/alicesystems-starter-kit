import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Rounding } from "./rounding";
import { divideRounded, ROUNDING_MODES } from "./rounding";

const DIVIDE_BY_ZERO = /divide/u;

/** What each rule does with a value exactly halfway, a little under, and a little over. */
const cases: Record<Rounding, Record<string, bigint>> = {
  "away-from-zero": { "-21/10": -3n, "-25/10": -3n, "21/10": 3n, "25/10": 3n },
  "half-away-from-zero": {
    "-24/10": -2n,
    "-25/10": -3n,
    "-26/10": -3n,
    "24/10": 2n,
    "25/10": 3n,
    "26/10": 3n,
  },
  "half-to-even": {
    "-25/10": -2n,
    "-35/10": -4n,
    "25/10": 2n,
    "26/10": 3n,
    "35/10": 4n,
  },
  "half-toward-zero": {
    "-25/10": -2n,
    "-26/10": -3n,
    "24/10": 2n,
    "25/10": 2n,
    "26/10": 3n,
  },
  "toward-zero": { "-29/10": -2n, "21/10": 2n, "29/10": 2n },
};

describe("divideRounded", () => {
  for (const mode of ROUNDING_MODES) {
    it.each(Object.entries(cases[mode]))(
      `${mode}: %s`,
      (fraction, expected) => {
        const [numerator = "0", denominator = "1"] = fraction.split("/");

        expect(
          divideRounded(BigInt(numerator), BigInt(denominator), mode)
        ).toBe(expected);
      }
    );
  }

  it("returns an exact division unchanged in every mode", () => {
    for (const mode of ROUNDING_MODES) {
      expect(divideRounded(10n, 5n, mode)).toBe(2n);
      expect(divideRounded(-10n, 5n, mode)).toBe(-2n);
      expect(divideRounded(0n, 7n, mode)).toBe(0n);
    }
  });

  it("refuses to divide by zero or by a negative number", () => {
    expect(() => divideRounded(1n, 0n, "toward-zero")).toThrow(DIVIDE_BY_ZERO);
    expect(() => divideRounded(1n, -2n, "toward-zero")).toThrow(DIVIDE_BY_ZERO);
  });

  it("always lands on a neighbour of the exact result", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ max: 10n ** 18n, min: -(10n ** 18n) }),
        fc.bigInt({ max: 10n ** 9n, min: 1n }),
        fc.constantFrom(...ROUNDING_MODES),
        (numerator, denominator, mode) => {
          const result = divideRounded(numerator, denominator, mode);
          // |result - exact| < 1, written without fractions: |result * d - n| < d.
          const gap = result * denominator - numerator;
          expect((gap < 0n ? -gap : gap) < denominator).toBe(true);
        }
      )
    );
  });
});
