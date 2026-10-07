import { FILTERED } from "@repo/analytics/url";
import { describe, expect, it } from "vitest";
import type { ScrubbableEvent } from "./scrub";
import { BASE_SENSITIVE_WORDS, createScrubber, defaultScrubber } from "./scrub";

const PLAIN_WORD = /^[a-z0-9]+$/u;
const NOT_A_KEY_WORD = /not a valid key word/u;

const { scrubBreadcrumb, scrubEvent, scrubText, scrubUrl, isSensitiveKey } =
  defaultScrubber;

const sampleEvent: ScrubbableEvent = {
  breadcrumbs: [
    { category: "console", message: "user alex@example.test logged a meal" },
    { category: "ui.click", message: "button Save" },
    {
      category: "fetch",
      data: { method: "POST", status_code: 500, url: "/api/entries?token=abc" },
    },
  ],
  contexts: {
    app: { name: "Template" },
    profile: { birthDate: "2025-10-01" },
  },
  extra: { password: "hunter2", route: "/log/meal" },
  request: {
    cookies: { session: "secret-session" },
    data: { food: "broccoli" },
    headers: {
      accept: "application/json",
      authorization: "Bearer abc",
      cookie: "session_token=abc",
      "x-forwarded-for": "203.0.113.7",
    },
    query_string: "token=abc",
    url: "https://app.example.test/reset-password/one-time-token?foo=1",
  },
  server_name: "scotts-laptop",
  user: {
    email: "alex@example.test",
    id: "user_1",
    ip_address: "203.0.113.7",
    username: "alex",
  },
};

describe("isSensitiveKey", () => {
  it.each([
    "password",
    "Password",
    "newPassword",
    "api_key",
    "apiKey",
    "API-KEY",
    "accessToken",
    "tokens",
    "emailAddress",
    "phoneNumber",
    "birthDate",
    "firstName",
    "full_name",
    "x-csrf-token",
    "Authorization",
    "sessionId",
  ])("hides %s", (key) => {
    expect(isSensitiveKey(key)).toBe(true);
  });

  it.each([
    "statusCode",
    "code",
    "name",
    "footprint",
    "keyboard",
    "pinned",
    "notes",
    "route",
    "passenger",
    "otpless",
    "message",
  ])("keeps %s", (key) => {
    expect(isSensitiveKey(key)).toBe(false);
  });

  it("only knows plain lowercase words in the base list", () => {
    for (const word of BASE_SENSITIVE_WORDS) {
      expect(word).toMatch(PLAIN_WORD);
    }
  });
});

describe("createScrubber", () => {
  it("hides the extra words a platform adds", () => {
    const { isSensitiveKey: isHidden, scrubValue } = createScrubber({
      extraKeys: ["note", "child"],
    });

    expect(isHidden("childName")).toBe(true);
    expect(isHidden("noteText")).toBe(true);
    expect(isHidden("statusCode")).toBe(false);
    expect(scrubValue({ note: "ate broccoli", route: "/log" })).toStrictEqual({
      note: FILTERED,
      route: "/log",
    });
  });

  it("refuses an extra word that is not plain, so it cannot act as a pattern", () => {
    expect(() => createScrubber({ extraKeys: [".*"] })).toThrow(NOT_A_KEY_WORD);
    expect(() => createScrubber({ extraKeys: ["Note"] })).toThrow(
      NOT_A_KEY_WORD
    );
  });

  it("hides the extra pages a platform adds in addresses", () => {
    const { scrubUrl: scrub } = createScrubber({
      secretSections: ["pay-link"],
    });

    expect(scrub("/pay-link/abc123")).toBe("/pay-link/[Filtered]");
    expect(scrubUrl("/pay-link/abc123")).toBe("/pay-link/abc123");
  });
});

describe("scrubEvent", () => {
  it("removes the request body, cookies and credentials", () => {
    const clean = scrubEvent(sampleEvent);

    expect(clean.request?.data).toBeUndefined();
    expect(clean.request?.cookies).toBeUndefined();
    expect(clean.request?.query_string).toBeUndefined();
    expect(clean.request?.headers).toStrictEqual({
      accept: "application/json",
    });
  });

  it("keeps only an opaque user id", () => {
    expect(scrubEvent(sampleEvent).user).toStrictEqual({ id: "user_1" });
  });

  it("drops a user with no id completely", () => {
    expect(
      scrubEvent({ user: { email: "alex@example.test" } }).user
    ).toStrictEqual({});
  });

  it("filters personal values in extra and contexts but keeps useful ones", () => {
    const clean = scrubEvent(sampleEvent);

    expect(clean.extra).toStrictEqual({
      password: FILTERED,
      route: "/log/meal",
    });
    expect(clean.contexts).toStrictEqual({
      app: { name: "Template" },
      profile: { birthDate: FILTERED },
    });
  });

  it("filters personal values in tags", () => {
    const clean = scrubEvent({ tags: { email: "a@b.test", route: "/log" } });

    expect(clean.tags).toStrictEqual({ email: FILTERED, route: "/log" });
  });

  it("hides one-time secrets in the request URL and the transaction name", () => {
    expect(scrubEvent(sampleEvent).request?.url).toBe(
      "https://app.example.test/reset-password/[Filtered]?foo=1"
    );
    expect(
      scrubEvent({ transaction: "/reset-password/abc123" }).transaction
    ).toBe("/reset-password/[Filtered]");
    expect(scrubEvent({ transaction: "GET /api/health" }).transaction).toBe(
      "GET /api/health"
    );
  });

  it("drops the host name and risky breadcrumbs, keeps network ones", () => {
    const clean = scrubEvent(sampleEvent);

    expect(clean.server_name).toBeUndefined();
    expect(clean.breadcrumbs).toHaveLength(1);
    expect(clean.breadcrumbs?.[0]?.data?.url).toBe(
      "/api/entries?token=%5BFiltered%5D"
    );
  });

  it("hides email addresses in the message and in exception values", () => {
    const clean = scrubEvent({
      exception: {
        values: [{ value: "Key (email)=(alex@example.test) already exists" }],
      },
      message: "Could not email alex@example.test",
    });

    expect(clean.message).toBe(`Could not email ${FILTERED}`);
    expect(clean.exception?.values?.[0]?.value).toBe(
      `Key (email)=(${FILTERED}) already exists`
    );
  });

  it("keeps messages without personal data and handles missing values", () => {
    const clean = scrubEvent({
      exception: {
        values: [{ value: "connect ECONNREFUSED 127.0.0.1:5432" }, {}],
      },
      message: "Database unavailable",
    });

    expect(clean.message).toBe("Database unavailable");
    expect(clean.exception?.values).toStrictEqual([
      { value: "connect ECONNREFUSED 127.0.0.1:5432" },
      { value: undefined },
    ]);
  });

  it("does not change the event it was given", () => {
    const before = JSON.stringify(sampleEvent);

    scrubEvent(sampleEvent);

    expect(JSON.stringify(sampleEvent)).toBe(before);
  });
});

describe("scrubText", () => {
  it("stays fast on a huge message with no email in it, and keeps only the start", () => {
    // A long run with no "@" is the worst case for the email pattern (it re-scans from every position).
    const huge = "a".repeat(200_000);
    const started = performance.now();

    const clean = scrubText(huge);

    expect(performance.now() - started).toBeLessThan(500);
    expect(clean.length).toBeLessThanOrEqual(4096);
  });
});

describe("scrubValue", () => {
  it("hides sensitive keys at any depth and emails inside strings", () => {
    expect(
      defaultScrubber.scrubValue({
        list: [{ token: "abc" }, "write to a@b.test"],
        nested: { deep: { secret: "x" } },
      })
    ).toStrictEqual({
      list: [{ token: FILTERED }, `write to ${FILTERED}`],
      nested: { deep: { secret: FILTERED } },
    });
  });

  it("replaces anything nested deeper than the limit", () => {
    const deep = {
      a: { b: { c: { d: { e: { f: { g: { h: "visible" } } } } } } },
    };

    expect(JSON.stringify(defaultScrubber.scrubValue(deep))).not.toContain(
      "visible"
    );
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console output and taps", () => {
    expect(scrubBreadcrumb({ category: "console", message: "x" })).toBeNull();
    expect(scrubBreadcrumb({ category: "ui.tap", message: "x" })).toBeNull();
  });

  it("keeps a plain breadcrumb unchanged", () => {
    const crumb = { category: "navigation", message: "to /charts" };

    expect(scrubBreadcrumb(crumb)).toStrictEqual(crumb);
  });

  it("hides an email in a breadcrumb message", () => {
    expect(
      scrubBreadcrumb({ category: "custom", message: "sent to a@b.test" })
        ?.message
    ).toBe(`sent to ${FILTERED}`);
  });

  it("filters sensitive keys in breadcrumb data", () => {
    const clean = scrubBreadcrumb({
      category: "custom",
      data: { email: "alex@example.test", step: "form" },
    });

    expect(clean?.data).toStrictEqual({ email: FILTERED, step: "form" });
  });
});

describe("scrubUrl", () => {
  it("filters sensitive query values and keeps the rest", () => {
    expect(scrubUrl("/verify?token=abc&page=2#top")).toBe(
      "/verify?token=%5BFiltered%5D&page=2#top"
    );
  });

  it("filters one-time path segments, including percent-encoded spellings", () => {
    expect(scrubUrl("/accept-invitation/abc123")).toBe(
      "/accept-invitation/[Filtered]"
    );
    expect(scrubUrl("/%72eset-password/abc123")).toBe(
      "/reset-password/[Filtered]"
    );
  });

  it("filters secrets in the fragment but keeps plain anchors", () => {
    expect(scrubUrl("/callback#access_token=abc&tab=1")).toBe(
      "/callback#access_token=%5BFiltered%5D&tab=1"
    );
    expect(scrubUrl("/help#sleep")).toBe("/help#sleep");
  });
});
