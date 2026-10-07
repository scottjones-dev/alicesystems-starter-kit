import { FILTERED } from "@repo/analytics/url";
import type { init as initNext } from "@sentry/nextjs";
import type { init as initNode } from "@sentry/node";
import type { init as initNative } from "@sentry/react-native";
import { describe, expect, it } from "vitest";
import { baseSentryOptions } from "./options";
import { createScrubber } from "./scrub";

describe("baseSentryOptions", () => {
  it("is off without a DSN and on with one", () => {
    expect(baseSentryOptions({ environment: "test" }).enabled).toBe(false);
    expect(
      baseSentryOptions({
        dsn: "https://key@o1.ingest.de.sentry.io/1",
        environment: "test",
      }).enabled
    ).toBe(true);
  });

  it("never sends personal data by default or records the screen", () => {
    const options = baseSentryOptions({ environment: "production" });

    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    // Nothing that could capture what is on screen or in memory is switched on.
    expect(Object.keys(options)).not.toEqual(
      expect.arrayContaining(["replaysSessionSampleRate"])
    );
    for (const risky of [
      "attachScreenshot",
      "attachViewHierarchy",
      "includeLocalVariables",
      "profilesSampleRate",
      "integrations",
      "replaysOnErrorSampleRate",
    ]) {
      expect(options).not.toHaveProperty(risky);
    }
  });

  it("passes events through the scrubber it is given", () => {
    const scrubber = createScrubber({ extraKeys: ["note"] });
    const { beforeSend } = baseSentryOptions({
      environment: "test",
      scrubber,
    });

    expect(
      beforeSend({ extra: { note: "private", route: "/x" } }).extra
    ).toStrictEqual({ note: FILTERED, route: "/x" });
  });

  it("is accepted by the Sentry SDK of every runtime", () => {
    // A compile-time check: if the SDK's types and ours drift apart, type-checking fails.
    const options = baseSentryOptions({ environment: "test" });
    const node: Parameters<typeof initNode>[0] = options;
    const next: Parameters<typeof initNext>[0] = options;
    const native: Parameters<typeof initNative>[0] = options;

    expect([node, next, native]).toHaveLength(3);
  });
});
