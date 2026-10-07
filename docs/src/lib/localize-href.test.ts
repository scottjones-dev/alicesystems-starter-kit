import { describe, expect, it } from "vitest";
import { localizeHref } from "./localize-href";

describe("localizeHref", () => {
  it("adds the language to a docs link", () => {
    expect(localizeHref("/docs/packages/db", "es")).toBe(
      "/es/docs/packages/db"
    );
  });

  it("adds the language to the docs home", () => {
    expect(localizeHref("/docs", "de")).toBe("/de/docs");
  });

  it("keeps a hash or query on a docs link", () => {
    expect(localizeHref("/docs#start", "fr")).toBe("/fr/docs#start");
    expect(localizeHref("/docs/faq#a", "fr")).toBe("/fr/docs/faq#a");
  });

  it("leaves external links, anchors and other paths alone", () => {
    expect(localizeHref("https://example.com/docs", "es")).toBe(
      "https://example.com/docs"
    );
    expect(localizeHref("#section", "es")).toBe("#section");
    expect(localizeHref("/llms.txt", "es")).toBe("/llms.txt");
  });

  it("does not match a path that only starts with the same letters", () => {
    expect(localizeHref("/documents", "es")).toBe("/documents");
  });

  it("leaves a link that already has a language alone", () => {
    expect(localizeHref("/en/docs/faq", "es")).toBe("/en/docs/faq");
  });

  it("passes through a missing href", () => {
    expect(localizeHref(undefined, "es")).toBeUndefined();
  });
});
