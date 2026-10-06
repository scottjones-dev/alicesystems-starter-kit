import { createEnv } from "@t3-oss/env-core";
import type { ZodType } from "zod";

/**
 * The one way every package declares its environment variables.
 *
 * It wraps `createEnv` from t3-env with the repo's defaults:
 * - an empty string counts as "not set", so `FOO=` in a .env file behaves like no line at all;
 * - `SKIP_ENV_VALIDATION=1` turns validation off, for CI builds that have no secrets.
 *
 * Validation runs as soon as this is called, so a bad config stops the process at boot with
 * the names of the broken variables, never in the middle of a request.
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
