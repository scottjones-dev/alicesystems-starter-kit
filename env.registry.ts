import { keys as api } from "./apps/api/src/keys";
import { keys as analytics } from "./packages/analytics/src/keys";
import { keys as db } from "./packages/db/src/keys";
import { keys as base } from "./packages/env/src/base";
import { keys as internationalization } from "./packages/internationalization/src/keys";
import { keys as notifications } from "./packages/notifications/src/keys";
import { keys as observability } from "./packages/observability/src/keys";

/**
 * Every package's and app's environment keys, one line each. The seed, `setup:local` and
 * `.env.example` tools read this list. When you add a package or app that defines keys with
 * `defineKeys`, add its `keys` here.
 */
export const registry = [
  base,
  api,
  db,
  internationalization,
  notifications,
  analytics,
  observability,
];
