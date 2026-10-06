import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createServerEnv } from "./create-env";

const INVALID = /Invalid environment variables/u;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("createServerEnv", () => {
  it("returns typed values read from process.env", () => {
    vi.stubEnv("TEST_PORT", "9000");
    const env = createServerEnv({ TEST_PORT: z.coerce.number() });
    expect(env.TEST_PORT).toBe(9000);
  });

  it("uses a default when the variable is missing", () => {
    const env = createServerEnv({ TEST_MODE: z.string().default("fast") });
    expect(env.TEST_MODE).toBe("fast");
  });

  it("treats an empty string as not set", () => {
    vi.stubEnv("TEST_MODE", "");
    const env = createServerEnv({ TEST_MODE: z.string().default("fast") });
    expect(env.TEST_MODE).toBe("fast");
  });

  it("refuses to start when a required variable is missing", () => {
    expect(() => createServerEnv({ TEST_REQUIRED: z.string().min(1) })).toThrow(
      INVALID
    );
  });

  it("refuses to start when a value is malformed", () => {
    vi.stubEnv("TEST_URL", "not a url");
    expect(() => createServerEnv({ TEST_URL: z.url() })).toThrow(INVALID);
  });

  it("skips validation when SKIP_ENV_VALIDATION is set", () => {
    vi.stubEnv("SKIP_ENV_VALIDATION", "1");
    expect(() =>
      createServerEnv({ TEST_REQUIRED: z.string().min(1) })
    ).not.toThrow();
  });
});

describe("base keys", () => {
  it("defaults NODE_ENV to development", async () => {
    vi.stubEnv("NODE_ENV", "");
    const { env } = await import("./base");
    expect(env.NODE_ENV).toBe("development");
  });

  it("refuses an unknown NODE_ENV", async () => {
    vi.stubEnv("NODE_ENV", "banana");
    await expect(import("./base")).rejects.toThrow(INVALID);
  });
});
