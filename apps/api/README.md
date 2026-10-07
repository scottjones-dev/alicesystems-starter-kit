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
  shutdown.ts       SIGTERM/SIGINT: stop the server, close the database, exit (with a time limit)
  lib/create-app.ts request id, error contract, security headers, CORS, body limit
  lib/validation-hook.ts  failed validation becomes VALIDATION_FAILED listing field paths only
  lib/responses.ts  jsonContent() and errorResponses() for OpenAPI route definitions
  routes/health.ts  the health routes
```

Every response carries an `x-request-id` (the caller's, if it sent one), and every error is `{ "error": { "code", "message", "requestId" } }` from `@repo/errors`. A bug shows a generic message; the real one is only logged, and only in development.

## Run it

```bash
pnpm infra:postgres:up   # the database
pnpm setup:local         # writes the root .env (DATABASE_URL, WEB_ORIGIN, PORT ...)
pnpm --filter api dev    # http://localhost:9000/api, restarts on changes
```

`dev` and `start` read the root `.env` and run with `tsx`: workspace packages export TypeScript source, so there is no build step. A production build and image come with the hosting step.

Ports in development: API **9000**, platform app **3000** (`WEB_ORIGIN`, the one browser origin CORS allows), website **3001**.

## Tests

`pnpm --filter api test` (no database or network needed):

- `app.test.ts`: both health routes (liveness never calls the database), request ids, the standard error body for unknown routes, `AppError`s and bugs, what is logged, the body limit, validation (field paths only, never the values sent), CORS and security headers, and the OpenAPI document and reference page being served in development and absent in production.
- `shutdown.test.ts`: order (server then database), clean exit, error exit, running once, and giving up after the time limit.
- `responses.test.ts`: the OpenAPI helpers.

`index.ts` is wiring (environment, sockets, signals), so it has no unit test; it was run against the local Postgres and its routes called by hand.

`pnpm --filter api check-types` for types.

## Depends on / used by

Depends on `hono`, `@hono/node-server`, `@hono/zod-openapi`, `@scalar/hono-api-reference`, `@repo/config`, `@repo/db`, `@repo/env` and `@repo/errors`. Called by the platform app, the website and the native app.
