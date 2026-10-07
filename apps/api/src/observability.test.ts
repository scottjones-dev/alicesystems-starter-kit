import { afterEach, describe, expect, it, vi } from "vitest";

import { setupObservability } from "./observability";

const emptyEnv = {
  BETTERSTACK_INGESTING_HOST: undefined,
  BETTERSTACK_SOURCE_TOKEN: undefined,
  BETTERSTACK_STATUS_URL: undefined,
  BETTERSTACK_UPTIME_TOKEN: undefined,
  EXPO_PUBLIC_SENTRY_DSN: undefined,
  EXPO_PUBLIC_SENTRY_ENVIRONMENT: undefined,
  NEXT_PUBLIC_SENTRY_DSN: undefined,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: undefined,
  SENTRY_AUTH_TOKEN: undefined,
  SENTRY_DSN: undefined,
  SENTRY_ENVIRONMENT: undefined,
  SENTRY_ORG: undefined,
  SENTRY_PROJECT: undefined,
  SENTRY_RELEASE: undefined,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("setupObservability", () => {
  it("keeps logs on standard output when Better Stack is not set up", async () => {
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    const { flush, logger } = setupObservability({
      env: emptyEnv,
      nodeEnv: "test",
    });

    logger.info("hello");
    await flush();

    expect(write).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("also ships logs to Better Stack when both settings are present", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const send = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 202 })
    );
    vi.stubGlobal("fetch", send);
    const { flush, logger } = setupObservability({
      env: {
        ...emptyEnv,
        BETTERSTACK_INGESTING_HOST: "s1.example.betterstackdata.com",
        BETTERSTACK_SOURCE_TOKEN: "tok",
      },
      nodeEnv: "production",
    });

    logger.info("hello");
    await flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBe(
      "https://s1.example.betterstackdata.com"
    );
  });

  it("needs both Better Stack settings: a token alone ships nothing", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const send = vi.fn();
    vi.stubGlobal("fetch", send);
    const { flush, logger } = setupObservability({
      env: { ...emptyEnv, BETTERSTACK_SOURCE_TOKEN: "tok" },
      nodeEnv: "production",
    });

    logger.info("hello");
    await flush();

    expect(send).not.toHaveBeenCalled();
  });

  it("logs an error's message in development only", () => {
    const lines: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    const error = new Error("row 42 failed");
    setupObservability({ env: emptyEnv, nodeEnv: "development" }).logger.error(
      "x",
      { error }
    );
    setupObservability({ env: emptyEnv, nodeEnv: "production" }).logger.error(
      "x",
      { error }
    );

    expect(lines[0]).toContain("row 42 failed");
    expect(lines[1]).not.toContain("row 42 failed");
  });

  it("reports a bug without throwing when Sentry has no DSN", () => {
    const { reportError } = setupObservability({
      env: emptyEnv,
      nodeEnv: "test",
    });

    expect(() =>
      reportError(new Error("bug"), { requestId: "r1" })
    ).not.toThrow();
  });
});
