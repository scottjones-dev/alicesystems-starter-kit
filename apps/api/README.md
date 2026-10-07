# api

The Hono backend: the only thing that talks to the database and, later, storage. Scaffolded with `pnpm create hono` (the `nodejs` template) and fitted into the monorepo.

## Why it exists

The website, the platform app and the native app all call one API, so rules (validation, errors, who may do what) live in one place. The reasoning is in [`docs/content/docs/apps/api.mdx`](../../docs/content/docs/apps/api.mdx).

## What it does today

| Route (under `/api`) | What it is |
| --- | --- |
| `GET /healthz` | liveness: the process is up. Never touches the database. |
| `GET /readyz` | readiness: the database answers. `503` with the standard `UNAVAILABLE` error when it does not. |
| `GET /openapi.json` | the OpenAPI 3.1 document, generated from the routes. **Development only.** |
| `GET /reference` | the Scalar reference page for it. **Development only.** |

Everything else answers `404` in the standard error body. Features (auth, notifications bridge, jobs) are mounted on this shell as their packages are built.

## What's inside

```
src/
  index.ts          starts the server: reads the environment, opens the database, shuts down cleanly
  app.ts            buildApp(): the shell with every route mounted; takes what it needs as options
  keys.ts           PORT (default 9000), defined for @repo/env
  observability.ts  starts Sentry and builds the logger (Better Stack when configured)
  queue.ts          the background job queue (`@repo/jobs`); jobs/registry.ts lists the jobs
  shutdown.ts       SIGTERM/SIGINT: stop the server, close the database, send the last logs and errors, exit (with a time limit)
  lib/create-app.ts request id, one log line per request, error contract and reporting, security headers, CORS, body limit
  lib/validation-hook.ts  failed validation becomes VALIDATION_FAILED listing field paths only
  lib/responses.ts  jsonContent() and errorResponses() for OpenAPI route definitions
  routes/health.ts  the health routes
```

Every response carries an `x-request-id` (the caller's, if it sent one), and every error is `{ "error": { "code", "message", "requestId" } }` from `@repo/errors`. A bug shows a generic message; the real one is only logged in development, and every bug is sent to Sentry (when `SENTRY_DSN` is set) tagged with its request id. Each request writes one JSON log line (method, scrubbed path, status, duration, request id); health probes are written at debug level only. See [`@repo/observability`](../../packages/observability/README.md).

## Run it

```bash
pnpm infra:postgres:up   # the database
pnpm setup:local         # writes the root .env (DATABASE_URL, WEB_ORIGIN, PORT ...)
pnpm --filter api dev    # http://localhost:9000/api, restarts on changes
```

`dev` and `start` read the root `.env` and run with `tsx`: workspace packages export TypeScript source, so there is no build step. A production build and image come with the hosting step.

Ports in development: API **9000**, platform app **8000** (`WEB_ORIGIN`, the one browser origin CORS allows), website **3000**, template docs **1000**, email preview **5000**, Storybook **6000**, product docs **4000**.

## Tests

`pnpm --filter api test` (no database or network needed):

- `app.test.ts`: both health routes (liveness never calls the database), request ids, the standard error body for unknown routes, `AppError`s and bugs, what is logged, the body limit, validation (field paths only, never the values sent), CORS and security headers, and the OpenAPI document and reference page being served in development and absent in production.
- `shutdown.test.ts`: order (server then database), clean exit, error exit, running once, and giving up after the time limit.
- `responses.test.ts`: the OpenAPI helpers.

`index.ts` is wiring (environment, sockets, signals), so it has no unit test; it was run against the local Postgres and its routes called by hand.

`src/observability.test.ts` checks the setup: logs go to standard output only, also to Better Stack when both settings are present, and error messages are logged in development only. `pnpm --filter api check-types` for types.

## Depends on / used by

Depends on `hono`, `@hono/node-server`, `@hono/zod-openapi`, `@scalar/hono-api-reference`, `@repo/config`, `@repo/db`, `@repo/env`, `@repo/errors`, `@repo/jobs`, `@repo/observability` and `@sentry/node`. Called by the platform app, the website and the native app.
