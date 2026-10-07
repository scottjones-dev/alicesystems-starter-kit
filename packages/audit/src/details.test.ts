import { describe, expect, it } from "vitest";

import { assertIdsOnly, auditCode, MAX_DETAIL_LENGTH } from "./details";

const FREE_TEXT = /free text/u;
const NO_NESTING = /no nested data/u;
const FINITE = /finite/u;

describe("assertIdsOnly", () => {
  it("accepts ids, codes, counts, flags and null", () => {
    expect(() =>
      assertIdsOnly({
        count: 3,
        flag: true,
        reason: "support_request",
        sale_id: "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f60",
        unset: null,
      })
    ).not.toThrow();
  });

  it("accepts an empty bag", () => {
    expect(() => assertIdsOnly({})).not.toThrow();
  });

  it("refuses prose, an email address and a long string, naming the key but not the value", () => {
    for (const bad of [
      "Ada Lovelace came in",
      "ada@example.com",
      "x".repeat(MAX_DETAIL_LENGTH + 1),
      "line\nbreak",
    ]) {
      expect(() => assertIdsOnly({ child_ref: bad })).toThrow(FREE_TEXT);
      try {
        assertIdsOnly({ child_ref: bad });
      } catch (error) {
        expect(String(error)).toContain("child_ref");
        expect(String(error)).not.toContain(bad);
      }
    }
  });

  it("accepts a string of exactly the longest length", () => {
    expect(() =>
      assertIdsOnly({ code: "x".repeat(MAX_DETAIL_LENGTH) })
    ).not.toThrow();
  });

  it("refuses nested data, which could hide anything", () => {
    expect(() => assertIdsOnly({ child: { name: "Ada" } })).toThrow(NO_NESTING);
    expect(() => assertIdsOnly({ ids: ["a", "b"] })).toThrow(NO_NESTING);
  });

  it("refuses a number that is not finite", () => {
    expect(() => assertIdsOnly({ n: Number.NaN })).toThrow(FINITE);
    expect(() => assertIdsOnly({ n: Number.POSITIVE_INFINITY })).toThrow(
      FINITE
    );
  });
});

describe("auditCode", () => {
  it("accepts a code and rejects prose", () => {
    expect(auditCode().safeParse("support_request").success).toBe(true);
    expect(auditCode().safeParse("a person's note").success).toBe(false);
    expect(auditCode().safeParse("a@b.test").success).toBe(false);
  });
});
