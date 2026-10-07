import { describe, expect, it } from "vitest";
import { getPageGithubUrl } from "./shared";

const sourceFolder =
  "https://github.com/scottjones-dev/alicesystems-starter-kit/blob/master/apps/docs/content/docs";

describe("getPageGithubUrl", () => {
  it("links a top-level page to its file in the monorepo", () => {
    expect(getPageGithubUrl({ path: "faq.mdx" })).toBe(
      `${sourceFolder}/faq.mdx`
    );
  });

  it("keeps the folders of a nested page", () => {
    expect(getPageGithubUrl({ path: "packages/db.md" })).toBe(
      `${sourceFolder}/packages/db.md`
    );
  });

  it("links a translated page to its own file", () => {
    expect(getPageGithubUrl({ path: "faq.es.mdx" })).toBe(
      `${sourceFolder}/faq.es.mdx`
    );
  });
});
