import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";

const BLACK_ON_WHITE = 21;
const PRECISION = 5;

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(
      BLACK_ON_WHITE,
      PRECISION
    );
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, PRECISION);
  });

  it("does not depend on the order of the two colours", () => {
    expect(contrastRatio("#1d4ed8", "#fafafa")).toBe(
      contrastRatio("#fafafa", "#1d4ed8")
    );
  });

  it("matches a published WCAG value (#777777 on white is about 4.48)", () => {
    const ratio = contrastRatio("#777777", "#ffffff");
    expect(ratio).toBeGreaterThan(4.4);
    expect(ratio).toBeLessThan(4.6);
  });

  it("refuses anything that is not a lowercase #rrggbb colour", () => {
    for (const bad of ["red", "#fff", "#FFFFFF", "ffffff", ""]) {
      expect(() => contrastRatio(bad, "#ffffff")).toThrow("#rrggbb");
    }
  });
});
