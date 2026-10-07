# @repo/observability

How we find out about real failures without sending personal data anywhere: shared Sentry options, a privacy scrubber each product can extend, structured logs shipped to Better Stack, and the uptime status for the website footer.

## Why it exists

The API, the website, the platform and the native app all need error reporting, and they must hide the same things (passwords, one-time links, emails). The rules are written once here. The package has no Sentry SDK of its own: each app installs the SDK it uses, and this package gives it the options. The reasoning and trade-offs are in [`docs/content/docs/packages/observability.mdx`](../../docs/content/docs/packages/observability.mdx).

Everything is optional and off by default. With no settings, nothing is sent anywhere and logs go to standard output.

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/observability/options` | `baseSentryOptions({ dsn, environment, release, scrubber })`: the options every app passes to `Sentry.init` |
| `@repo/observability/scrub` | `createScrubber({ extraKeys, secretSections })` and `defaultScrubber`: `scrubEvent`, `scrubBreadcrumb`, `scrubValue`, `scrubText`, `scrubUrl` |
| `@repo/observability/log` | `createLogger` (JSON lines, same rules) and `createBetterStackShipper` |
| `@repo/observability/status` | `getServiceStatus` (Better Stack Uptime, no markup) and `summarizeStatuses` |
| `@repo/observability/keys` | the environment keys (all optional) |
| `@repo/observability/next/instrumentation`, `/next/client`, `/next/config` | the Sentry setup for a Next.js app (server, browser, build) |

## Use it

```ts
// Any app: add your product's own sensitive words once.
const scrubber = createScrubber({ extraKeys: ["note", "child"], secretSections: ["pay-link"] });
Sentry.init(baseSentryOptions({ dsn, environment, scrubber }));

// API: one JSON line per event, with the request id.
const logger = createLogger({ service: "api", shipper });
logger.child({ requestId }).info("request", { status: 200 });
```

A Next.js app needs four small files, all one-liners (see `apps/website`): `instrumentation.ts`, `instrumentation-client.ts`, `global-error.tsx`, and `withObservability(nextConfig)` in `next.config.ts`.

### What is hidden

A key is read as words (`apiKey`, `api_key` and `API-KEY` are all "api" and "key"), so `footprint` is not mistaken for `otp`. The base list covers credentials and contact details: password, token, secret, cookie, authorization, API key, email, phone, birth date, one-time code, session, signature, and the person-name keys (`firstName`, `fullName`, `username`...). Products add theirs with `extraKeys` (lowercase letters and digits). Request bodies, cookies, auth headers and the user's email, name and IP are always removed; one-time links and query secrets in addresses are hidden (reusing `@repo/analytics/url`); emails inside messages are replaced.

### Deliberately not switched on

Session replay, screenshots, view hierarchy, profiling, local variables in stack traces, console forwarding and performance tracing. Each can capture what is on screen or in memory. Do not add one without a privacy review.

## Environment keys

All optional. `SENTRY_DSN` (API), `NEXT_PUBLIC_SENTRY_DSN` (website and platform), `EXPO_PUBLIC_SENTRY_DSN` (native), their `*_SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (API), `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` (web build, source maps), `BETTERSTACK_SOURCE_TOKEN` and `BETTERSTACK_INGESTING_HOST` (API logs), `BETTERSTACK_UPTIME_TOKEN` and `BETTERSTACK_STATUS_URL` (website footer). Create the Sentry organization in the **EU** region; the DSN's host (`ingest.de.sentry.io`) then keeps the data there.

## Tests

`pnpm --filter @repo/observability test`: the scrubber (each leak path: bodies, cookies, headers, the user, keys at any depth, addresses including percent-encoded ones, emails in messages, a huge message, the input not being changed), the logger (JSON lines, levels, scrubbing, error messages only in development, never throwing), the Better Stack shipper (batching, the flush timer, dropping a failed batch, a buffer limit) and the status (summary rules, request, failure, a malformed response). A type check proves the options are accepted by the Node, Next.js and React Native SDKs. `pnpm --filter @repo/observability check-types` for types.

Not tested: a real event reaching Sentry or Better Stack. That needs accounts.

## Depends on / used by

Depends on `@repo/analytics` (URL scrubbing), `@repo/env` and `zod`; the Sentry SDKs are optional peers. Used by `apps/api`, `apps/website`, `apps/platform` and `apps/native`.
