import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { allocate, split } from "./allocate";
import { money, sum } from "./money";

const AT_LEAST_ONE = /at least one/iu;
const MORE_THAN_ZERO = /more than zero/u;
const WHOLE_RATIOS = /whole numbers/u;
const WHOLE_PARTS = /whole number of parts/u;

const gbp = (amount: number) => money(amount, "GBP");
const amounts = (parts: { amount: number }[]) =>
  parts.map((part) => part.amount);

describe("allocate", () => {
  it("splits 100.00 three ways without losing a penny", () => {
    expect(amounts(split(gbp(10_000), 3))).toStrictEqual([3334, 3333, 3333]);
  });

  it("splits by ratio", () => {
    expect(amounts(allocate(gbp(100), [70, 30]))).toStrictEqual([70, 30]);
    expect(amounts(allocate(gbp(5), [3, 7]))).toStrictEqual([2, 3]);
    expect(amounts(allocate(gbp(10), [1, 2, 3]))).toStrictEqual([2, 3, 5]);
  });

  it("gives the extra units to the part that lost the most, the earlier part first on a tie", () => {
    // 5 split 1:1:1: each part loses two thirds of a unit, so the first two get the extras.
    expect(amounts(allocate(gbp(5), [1, 1, 1]))).toStrictEqual([2, 2, 1]);
    // 1 split 1:2:3: the third part lost the most, so it gets the only unit.
    expect(amounts(allocate(gbp(1), [1, 2, 3]))).toStrictEqual([0, 0, 1]);
  });

  it("gives a zero ratio nothing", () => {
    expect(amounts(allocate(gbp(100), [0, 1, 0]))).toStrictEqual([0, 100, 0]);
  });

  it("splits a refund the way the charge was split", () => {
    expect(amounts(allocate(gbp(-10_000), [1, 1, 1]))).toStrictEqual([
      -3334, -3333, -3333,
    ]);
  });

  it("splits zero into zeros, and a total smaller than the parts into ones and zeros", () => {
    expect(amounts(split(gbp(0), 3))).toStrictEqual([0, 0, 0]);
    expect(amounts(split(gbp(2), 5))).toStrictEqual([1, 1, 0, 0, 0]);
  });

  it("keeps the currency", () => {
    expect(
      allocate(money(9, "JPY"), [1, 1]).map((part) => part.currency)
    ).toStrictEqual(["JPY", "JPY"]);
  });

  it("refuses ratios that cannot be used", () => {
    expect(() => allocate(gbp(1), [])).toThrow(AT_LEAST_ONE);
    expect(() => allocate(gbp(1), [0, 0])).toThrow(MORE_THAN_ZERO);
    expect(() => allocate(gbp(1), [-1, 2])).toThrow(WHOLE_RATIOS);
    expect(() => allocate(gbp(1), [1.5])).toThrow(WHOLE_RATIOS);
    expect(() => split(gbp(1), 0)).toThrow(WHOLE_PARTS);
    expect(() => split(gbp(1), 2.5)).toThrow(WHOLE_PARTS);
  });

  it("always adds up to the total, and no part is a whole unit off its exact share", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 2 ** 50, min: -(2 ** 50) }),
        fc
          .array(fc.integer({ max: 1000, min: 0 }), {
            maxLength: 12,
            minLength: 1,
          })
          .filter((ratios) => ratios.some((ratio) => ratio > 0)),
        (total, ratios) => {
          const parts = allocate(gbp(total), ratios);

          expect(sum(parts, "GBP")).toStrictEqual(gbp(total));
          expect(parts).toHaveLength(ratios.length);
          const ratioTotal = ratios.reduce((a, b) => a + b, 0);
          for (const [index, part] of parts.entries()) {
            const exact = (total * (ratios[index] ?? 0)) / ratioTotal;
            expect(Math.abs(part.amount - exact)).toBeLessThan(1);
          }
        }
      )
    );
  });

  it("never gives a part the opposite sign of the total", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 100_000, min: -100_000 }),
        fc.integer({ max: 20, min: 1 }),
        (total, parts) => {
          for (const part of split(gbp(total), parts)) {
            expect(
              Math.sign(part.amount) * Math.sign(total)
            ).toBeGreaterThanOrEqual(0);
          }
        }
      )
    );
  });

  it("splits the largest amounts exactly, where multiplying in floating point would not", () => {
    const total = gbp(Number.MAX_SAFE_INTEGER);

    expect(sum(allocate(total, [3, 5, 7, 11]), "GBP")).toStrictEqual(total);
  });
});
