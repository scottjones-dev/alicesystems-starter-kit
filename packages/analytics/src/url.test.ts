import { describe, expect, it } from "vitest";

import {
  createUrlTools,
  FILTERED,
  normalizeUrl,
  ONE_TIME_LINK_SECTIONS,
} from "./url";

const { isTrackedPath, scrubUrl } = createUrlTools(ONE_TIME_LINK_SECTIONS);
const FILTERED_ENCODED = encodeURIComponent(FILTERED);

describe("normalizeUrl", () => {
  it("writes escaped plain characters as themselves", () => {
    expect(normalizeUrl("/%72eset-password")).toBe("/reset-password");
    expect(normalizeUrl("/reset%2Dpassword")).toBe("/reset-password");
  });

  it("leaves escapes that mean something else alone", () => {
    expect(normalizeUrl("/a%2Fb%20c")).toBe("/a%2Fb%20c");
  });
});

describe("isTrackedPath", () => {
  it("tracks ordinary pages", () => {
    for (const page of ["/", "/dashboard", "https://example.com/report/12"]) {
      expect(isTrackedPath(page), page).toBe(true);
    }
  });

  it("never tracks a page that carries a one-time link", () => {
    for (const section of ONE_TIME_LINK_SECTIONS) {
      expect(isTrackedPath(`/${section}/abc123`), section).toBe(false);
      expect(
        isTrackedPath(`http://localhost:3000/${section}?x=1`),
        section
      ).toBe(false);
    }
  });

  it("cannot be fooled by percent-encoding, repeated slashes or capitals", () => {
    for (const disguised of [
      "/%72eset-password/abc",
      "/reset%2Dpassword",
      "//reset-password/abc",
      "/RESET-Password/abc",
      "https://example.com/%76erify-email/x",
    ]) {
      expect(isTrackedPath(disguised), disguised).toBe(false);
    }
  });

  it("does not mistake a page that only starts with the same letters", () => {
    expect(isTrackedPath("/reset-password-help")).toBe(true);
    expect(isTrackedPath("/verify-email-preferences")).toBe(true);
  });
});

describe("scrubUrl", () => {
  it("hides sensitive values in the query and keeps the rest", () => {
    expect(scrubUrl("http://localhost:3000/welcome?token=SECRET&tab=1")).toBe(
      `http://localhost:3000/welcome?token=${FILTERED_ENCODED}&tab=1`
    );
    expect(scrubUrl("https://example.com/?email=a@b.c")).toBe(
      `https://example.com/?email=${FILTERED_ENCODED}`
    );
  });

  it("hides the secret in a one-time link's path", () => {
    expect(scrubUrl("/reset-password/SECRET-TOKEN")).toBe(
      `/reset-password/${FILTERED}`
    );
    expect(scrubUrl("/accept-invitation/inv_123")).toBe(
      `/accept-invitation/${FILTERED}`
    );
    expect(scrubUrl("https://x.test/magic-link/abc?z=1")).toBe(
      `https://x.test/magic-link/${FILTERED}?z=1`
    );
  });

  it("sees through percent-encoded spellings of a secret path", () => {
    expect(scrubUrl("/%72eset-password/SECRET")).not.toContain("SECRET");
  });

  it("hides secrets in the fragment (OAuth responses), but keeps a plain anchor", () => {
    expect(scrubUrl("https://x.test/cb#access_token=SECRET&x=1")).toBe(
      `https://x.test/cb#access_token=${FILTERED_ENCODED}&x=1`
    );
    expect(scrubUrl("https://x.test/docs#install")).toBe(
      "https://x.test/docs#install"
    );
  });

  it("leaves values that are not addresses alone", () => {
    expect(scrubUrl("$direct")).toBe("$direct");
    expect(scrubUrl("/plain/path")).toBe("/plain/path");
  });
});

describe("createUrlTools", () => {
  it("covers extra sections a platform adds", () => {
    const tools = createUrlTools([
      ...ONE_TIME_LINK_SECTIONS,
      "approve-timesheet",
    ]);
    expect(tools.isTrackedPath("/approve-timesheet/abc")).toBe(false);
    expect(tools.scrubUrl("/approve-timesheet/SECRET")).toBe(
      `/approve-timesheet/${FILTERED}`
    );
    // The default tools do not know about it.
    expect(isTrackedPath("/approve-timesheet/abc")).toBe(true);
  });

  it("refuses a section name that is not plain, since it is written into a pattern", () => {
    for (const bad of ["a|b", "a.b", "(x)", "A B", "", "../x"]) {
      expect(() => createUrlTools([bad]), bad).toThrow(
        "not a valid page section"
      );
    }
  });
});
