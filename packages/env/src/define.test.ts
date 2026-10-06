import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { keys as base } from "./base";
import {
  createServerEnv,
  defineKeys,
  isRequired,
  randomSecret,
} from "./define";

const INVALID = /Invalid environment variables/u;
const MIN_SECRET_LENGTH = 32;

afterEach(() => {
  vi.unstubAllEnvs();
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

describe("defineKeys", () => {
  const keys = defineKeys({
    TEST_NAME: {
      description: "A name",
      folder: "/api",
      schema: z.string().min(1),
    },
  });

  it("validates nothing until .env() is called", () => {
    expect(keys.definitions.TEST_NAME.description).toBe("A name");
  });

  it("validates the definitions' schemas when .env() is called", () => {
    expect(() => keys.env()).toThrow(INVALID);
    vi.stubEnv("TEST_NAME", "pub");
    expect(keys.env().TEST_NAME).toBe("pub");
  });
});

describe("isRequired", () => {
  const definition = { description: "x", folder: "/api" } as const;

  it("is true when the schema rejects an unset value", () => {
    expect(isRequired({ ...definition, schema: z.string() })).toBe(true);
  });

  it("is false for optional keys and keys with a default", () => {
    expect(isRequired({ ...definition, schema: z.string().optional() })).toBe(
      false
    );
    expect(isRequired({ ...definition, schema: z.string().default("a") })).toBe(
      false
    );
  });
});

describe("randomSecret", () => {
  it("is long enough to sign with and different every time", () => {
    const first = randomSecret();
    expect(first.length).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
    expect(randomSecret()).not.toBe(first);
  });
});

describe("base keys", () => {
  it("defaults NODE_ENV to development", () => {
    vi.stubEnv("NODE_ENV", "");
    expect(base.env().NODE_ENV).toBe("development");
  });

  it("refuses an unknown NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "banana");
    expect(() => base.env()).toThrow(INVALID);
  });
});
