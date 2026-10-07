import { describe, expect, it } from "vitest";

import { keys } from "./keys";

const { definitions } = keys;

describe("observability keys", () => {
  it("are all optional, so development and tests need no accounts", () => {
    for (const [name, definition] of Object.entries(definitions)) {
      expect(definition.schema.safeParse(undefined).success, name).toBe(true);
    }
  });

  it("keep every Sentry DSN in its runtime's folder with that runtime's public prefix", () => {
    expect(definitions.SENTRY_DSN.folder).toBe("/api");
    expect(definitions.NEXT_PUBLIC_SENTRY_DSN.folder).toBe("/web");
    expect(definitions.EXPO_PUBLIC_SENTRY_DSN.folder).toBe("/native");
  });

  it("fills the Sentry environment name for each environment", () => {
    const { auto } = definitions.SENTRY_ENVIRONMENT;

    expect(auto("dev")).toBe("development");
    expect(auto("staging")).toBe("staging");
    expect(auto("prod")).toBe("production");
  });

  it("accepts a Better Stack host name and rejects a URL", () => {
    const host = definitions.BETTERSTACK_INGESTING_HOST.schema;

    expect(host.safeParse("s1.eu-nbg-2.betterstackdata.com").success).toBe(
      true
    );
    expect(host.safeParse("https://s1.example.com").success).toBe(false);
  });

  it("requires a DSN to be a URL", () => {
    expect(definitions.SENTRY_DSN.schema.safeParse("not a url").success).toBe(
      false
    );
  });
});
