import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("uses DOCS_SITE_URL when it is set", () => {
    const url = getSiteUrl({ DOCS_SITE_URL: "https://docs.example.com" });

    expect(url.origin).toBe("https://docs.example.com");
  });

  it("falls back to localhost in development", () => {
    expect(getSiteUrl({ NODE_ENV: "development" }).origin).toBe(
      "http://localhost:1000"
    );
    expect(getSiteUrl({}).origin).toBe("http://localhost:1000");
  });

  it("refuses to build for production without a site address", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production" })).toThrow(
      "DOCS_SITE_URL is not set"
    );
  });

  it("allows a production build that is not deployed when validation is skipped", () => {
    const url = getSiteUrl({
      NODE_ENV: "production",
      SKIP_ENV_VALIDATION: "1",
    });

    expect(url.origin).toBe("http://localhost:1000");
  });

  it("rejects an address that is not a URL", () => {
    expect(() => getSiteUrl({ DOCS_SITE_URL: "docs.example.com" })).toThrow();
  });
});
