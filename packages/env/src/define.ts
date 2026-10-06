import { randomBytes } from "node:crypto";

import { createEnv } from "@t3-oss/env-core";
import type { ZodType } from "zod";

export const ENVIRONMENTS = ["dev", "test", "staging", "prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

/** The Infisical folder a key lives in. One folder per runtime that reads it. */
export const FOLDERS = ["/api", "/web", "/native"] as const;
export type Folder = (typeof FOLDERS)[number];

/** Everything we know about one environment variable. It is written once, here. */
export interface KeyDef {
  /** A value we can fill in ourselves for this environment, or undefined if a human must. */
  auto?: (environment: Environment) => string | undefined;
  description: string;
  folder: Folder;
  /** Where a human gets the value (a dashboard, a command). Shown when the key is missing. */
  hint?: string;
  /** Value for `pnpm setup:local`. Falls back to the `auto` value for dev. */
  local?: string;
  /** Validation. A schema that accepts `undefined` makes the key optional. */
  schema: ZodType;
}

/** 32 random bytes is 43 base64url characters, over the 32 most signing secrets need. */
const SECRET_BYTES = 32;

/** Use as `auto: randomSecret` for signing secrets: every environment gets its own. */
export const randomSecret = (): string =>
  randomBytes(SECRET_BYTES).toString("base64url");

/** True when the app cannot start without this key. */
export const isRequired = (definition: KeyDef): boolean =>
  !definition.schema.safeParse(undefined).success;

/**
 * Validates `process.env` against a set of zod schemas. An empty string counts as "not set"
 * (so `FOO=` in a .env file behaves like no line), and `SKIP_ENV_VALIDATION=1` turns
 * validation off for CI builds that have no secrets. A bad config throws here, at startup,
 * naming the broken variables, never in the middle of a request.
 */
export const createServerEnv = <Shape extends Record<string, ZodType>>(
  server: Shape
) =>
  createEnv({
    emptyStringAsUndefined: true,
    runtimeEnv: process.env,
    server,
    skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
  });

/**
 * Declares a package's environment variables. Nothing is validated until `.env()` is called,
 * so tools (seed, setup:local, .env.example) can read the definitions without side effects.
 */
export const defineKeys = <Definitions extends Record<string, KeyDef>>(
  definitions: Definitions
) => ({
  definitions,
  env: () => {
    const schemas = Object.fromEntries(
      Object.entries(definitions).map(([key, { schema }]) => [key, schema])
    );
    // SAFETY: the object above has exactly the keys of `definitions`, each mapped to its schema.
    return createServerEnv(
      schemas as { [Key in keyof Definitions]: Definitions[Key]["schema"] }
    );
  },
});

/** What a registry holds: the result of one `defineKeys` call per package. */
export interface KeySet {
  definitions: Record<string, KeyDef>;
}
