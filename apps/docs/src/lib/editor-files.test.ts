import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentRoot, resolveDocPath } from "./editor-files";

describe("resolveDocPath", () => {
  it("maps segments to an mdx file inside content/docs", () => {
    expect(resolveDocPath(["editor"])).toBe(
      path.join(contentRoot, "editor.mdx")
    );
    expect(resolveDocPath(["guides", "setup"])).toBe(
      path.join(contentRoot, "guides", "setup.mdx")
    );
  });

  it("falls back to the index page when there are no segments", () => {
    expect(resolveDocPath([])).toBe(path.join(contentRoot, "index.mdx"));
  });

  it("rejects paths that climb out of content/docs", () => {
    expect(resolveDocPath(["..", "..", "package"])).toBeNull();
    expect(resolveDocPath(["..", "docs-secret", "x"])).toBeNull();
  });
});
