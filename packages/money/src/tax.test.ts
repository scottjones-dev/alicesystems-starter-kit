import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { add, money } from "./money";
import { ROUNDING_MODES } from "./rounding";
import { addVat, percentage, removeVat } from "./tax";

const BASIS_POINTS = /basis points/u;

const gbp = (amount: number) => money(amount, "GBP");
const VAT_20 = 2000;

describe("percentage", () => {
  it("takes a share in basis points", () => {
    expect(percentage(gbp(1000), 2000, "half-away-from-zero")).toStrictEqual(
      gbp(200)
    );
    expect(percentage(gbp(1000), 550, "half-away-from-zero")).toStrictEqual(
      gbp(55)
    );
    expect(percentage(gbp(1000), 0, "half-away-from-zero")).toStrictEqual(
      gbp(0)
    );
  });

  it("rounds as told when the share is not a whole unit", () => {
    // 20% of 12.5p would be 2.5p, so use 25p at 10%: exactly 2.5p.
    const quarter = gbp(25);

    expect(percentage(quarter, 1000, "half-away-from-zero").amount).toBe(3);
    expect(percentage(quarter, 1000, "half-to-even").amount).toBe(2);
    expect(percentage(quarter, 1000, "half-toward-zero").amount).toBe(2);
    expect(percentage(quarter, 1000, "toward-zero").amount).toBe(2);
    expect(percentage(quarter, 1000, "away-from-zero").amount).toBe(3);
  });

  it("rounds a negative amount by its size, not toward positive infinity", () => {
    expect(percentage(gbp(-25), 1000, "half-away-from-zero").amount).toBe(-3);
    expect(percentage(gbp(-25), 1000, "half-toward-zero").amount).toBe(-2);
  });

  it("refuses a rate that is not whole basis points or is negative", () => {
    expect(() => percentage(gbp(100), 12.5, "toward-zero")).toThrow(
      BASIS_POINTS
    );
    expect(() => percentage(gbp(100), -1, "toward-zero")).toThrow(BASIS_POINTS);
  });

  it("is exact on the largest amounts, where amount times rate passes 2^53", () => {
    // 10% of 9,007,199,254,740,990 is 900,719,925,474,099 exactly.
    expect(
      percentage(gbp(9_007_199_254_740_990), 1000, "toward-zero").amount
    ).toBe(900_719_925_474_099);
  });
});

describe("addVat and removeVat", () => {
  it("adds 20% VAT to a net price", () => {
    expect(addVat(gbp(1000), VAT_20, "half-away-from-zero")).toStrictEqual({
      gross: gbp(1200),
      net: gbp(1000),
      vat: gbp(200),
    });
  });

  it("takes VAT out of a gross price", () => {
    expect(removeVat(gbp(1200), VAT_20, "half-away-from-zero")).toStrictEqual({
      gross: gbp(1200),
      net: gbp(1000),
      vat: gbp(200),
    });
  });

  it("gives different totals per line and per invoice, which is why the rounding is a choice", () => {
    // Three lines of 7p net at 20%: each line's VAT is 1.4p, which rounds to 1p, so 3p in all.
    // The same 21p as one invoice has 4.2p of VAT, which rounds to 4p.
    const lines = [gbp(7), gbp(7), gbp(7)];
    const perLine = lines.reduce(
      (total, line) =>
        add(total, addVat(line, VAT_20, "half-away-from-zero").vat),
      gbp(0)
    );
    const perInvoice = addVat(gbp(21), VAT_20, "half-away-from-zero").vat;

    expect(perLine).toStrictEqual(gbp(3));
    expect(perInvoice).toStrictEqual(gbp(4));
  });

  it("removing VAT always leaves net plus VAT equal to the gross", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 2 ** 50, min: -(2 ** 50) }),
        fc.integer({ max: 10_000, min: 0 }),
        fc.constantFrom(...ROUNDING_MODES),
        (gross, rate, rounding) => {
          const { net, vat } = removeVat(gbp(gross), rate, rounding);

          expect(add(net, vat)).toStrictEqual(gbp(gross));
        }
      )
    );
  });

  it("adding VAT then removing it returns the net within one unit, for any rounding", () => {
    fc.assert(
      fc.property(
        fc.integer({ max: 2 ** 40, min: 0 }),
        fc.integer({ max: 3000, min: 0 }),
        fc.constantFrom(...ROUNDING_MODES),
        (net, rate, rounding) => {
          const added = addVat(gbp(net), rate, rounding);
          const removed = removeVat(added.gross, rate, rounding);

          expect(Math.abs(removed.net.amount - net)).toBeLessThanOrEqual(1);
        }
      )
    );
  });

  it("with a zero rate changes nothing", () => {
    expect(addVat(gbp(500), 0, "toward-zero").gross).toStrictEqual(gbp(500));
    expect(removeVat(gbp(500), 0, "toward-zero").net).toStrictEqual(gbp(500));
  });
});
