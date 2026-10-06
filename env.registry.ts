import { keys as db } from "./packages/db/src/keys";
import { keys as base } from "./packages/env/src/base";
import { keys as internationalization } from "./packages/internationalization/src/keys";
import { keys as notifications } from "./packages/notifications/src/keys";

/**
 * Every package's environment keys, one line per package. The seed, `setup:local` and
 * `.env.example` tools read this list. When you add a package that defines keys with
 * `defineKeys`, add its `keys` here.
 */
export const registry = [base, db, internationalization, notifications];
