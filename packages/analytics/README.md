# @repo/analytics

The event catalog and privacy rules for product analytics (PostHog, EU region), shared by web and native.

## Why it exists

We want to know how the product is used, but no personal data may leave the app. The rules live here once so web and native cannot drift. This package has no analytics SDK at run time; each app installs its own (`posthog-js`, `posthog-react-native`) and passes these rules into it. The reasoning is in [`docs/content/docs/packages/analytics.mdx`](../../docs/content/docs/packages/analytics.mdx).

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/analytics/events` | `createCatalog()`, `baseCatalog`, `baseSchemas`, `catalogProblems()`, the `PropertyBag` type |
| `@repo/analytics/rules` | `rules` (the defaults), `createAnalyticsRules()`, `DEFAULT_DENIED_PROPERTIES` |
| `@repo/analytics/options` | `POSTHOG_EU_HOST`, `POSTHOG_UI_HOST`, `WEB_INGEST_PATH`, `posthogWebOptions()` |
| `@repo/analytics/url` | `createUrlTools()`, `normalizeUrl()`, `ONE_TIME_LINK_SECTIONS`, `FILTERED` |
| `@repo/analytics/keys` | the PostHog project keys, for `@repo/env` |

## Use it

```ts
import { baseCatalog } from "@repo/analytics/events";

// One tracker per app, over whatever SDK the app uses.
export const track = baseCatalog.createTracker((name, properties) =>
  posthog.capture(name, properties)
);

track("sign_in_completed", { method: "google" }); // true: sent
track("sign_in_completed", { method: "carrier pigeon" }); // compile error; dropped at run time
```

The web app starts PostHog with the shared settings:

```ts
import { posthogWebOptions } from "@repo/analytics/options";

posthog.init(token, posthogWebOptions({ consented: hasAgreed }));
```

The native app passes `rules.beforeSend` as the SDK's `beforeSend`.

### Add events for a platform

```ts
import { z } from "zod";
import { baseSchemas, createCatalog } from "@repo/analytics/events";

export const catalog = createCatalog({
  ...baseSchemas,
  invoice_sent: z.strictObject({ channel: z.enum(["email", "post"]) }),
});
```

`createCatalog` throws if an event is not `strictObject`, or has a field that can hold free text or personal data (a plain string or number). Use an enum, a boolean or a literal; bucket numbers into enums.

### Add rules for a platform

```ts
import { createAnalyticsRules } from "@repo/analytics/rules";

export const rules = createAnalyticsRules({
  deniedProperties: ["child_name"], // never sent
  secretSections: ["approve-timesheet"], // /approve-timesheet/<token> is never tracked
});
```

## Tests

`pnpm --filter @repo/analytics test` (no network):

- `events.test.ts`: the base catalog, the free-text rule (in every shipped schema, and refused when a platform defines one), unknown properties and values dropped, the tracker.
- `rules.test.ts`: pages with one-time links are dropped; addresses are scrubbed in every address-like property, including the previous page, the first page of the visit and the `$set` / `$set_once` bags; denied properties removed; the event passed in is not changed; platform extensions.
- `url.test.ts`: percent-encoded, repeated-slash and capitalised spellings of a secret page; query and fragment secrets; plain anchors kept; section names validated.
- `options.test.ts`: EU hosts, nothing stored before consent, replay and autocapture off, the privacy rules wired in. The options are also type-checked against `posthog-js`.

`pnpm --filter @repo/analytics check-types` for types.

Not covered: a real PostHog project. The rules are pure functions and the options are type-checked, but no event has been sent to the service yet.

## Depends on / used by

Depends on `zod` and `@repo/env` (keys); `posthog-js` is a dev dependency, for its types only. Used by the web and native apps (not built yet), and by auth's sign-in events.
