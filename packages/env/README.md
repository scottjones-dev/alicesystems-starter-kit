# @repo/env

Typed, validated environment variables, plus the tools that fill them in.

## Why it exists

Bad or missing config should fail at startup with a clear message, not deep inside a request. This package holds the shared pieces; each feature package declares its own keys next to its code, so removing a package removes its keys. The reasoning is in [`docs/env.md`](../../docs/env.md).

## What's inside

| Import / script | What it does |
| --- | --- |
| `@repo/env/create` | `createServerEnv(shape)`: validates `process.env` against a zod shape. Empty strings count as unset, and `SKIP_ENV_VALIDATION=1` turns validation off (CI builds). |
| `@repo/env/base` | The keys every runtime has (`NODE_ENV`), as `keys()` and a ready `env`. |
| `pnpm secrets:seed <dev\|staging\|prod> [--dry-run]` | Fills a fresh Infisical environment (`src/seed/`). |
| `pnpm setup:local [--force]` | Writes a root `.env` for running with no accounts (`src/local/`). |

## Use it

A package declares its keys in its own `keys.ts`:

```ts
import { createServerEnv } from "@repo/env/create";
import { z } from "zod";

export const keys = () =>
  createServerEnv({ DATABASE_URL: z.url() });
```

An app reads them:

```ts
import { env } from "@repo/env/base";

console.log(env.NODE_ENV);
```

When a package adds a key it must also add it to `src/seed/plan.ts`, `src/local/plan.ts` and the root `.env.example`, in the same change.

## Seeding Infisical

Needs the `infisical` CLI on your PATH and a one-time `infisical login` (run `infisical init` in the repo root to link the `starterkit` project). Then:

```bash
pnpm secrets:seed dev              # local development
pnpm secrets:seed prod --dry-run   # show what would be added, change nothing
```

Per environment it creates the `/api`, `/web` and `/native` folders if missing, adds any **missing** key it can fill itself (it never overwrites an existing key), and prints the keys that still need a real value from a vendor dashboard. Values reach Infisical through a temporary owner-only file and are never printed.

`pnpm secrets:push` sends **every** key in the root `.env` to Infisical `dev /api` and **overwrites** existing ones.

## Tests

`pnpm --filter @repo/env test` covers `createServerEnv` (typed values, defaults, empty strings, missing and malformed values, skip switch), the base keys, and the seed and local-setup plans. `seed/seed.ts` and `local/setup.ts` are thin glue over the `infisical` CLI and the file system, so they are not unit tested; check the seed with `--dry-run`.

`pnpm --filter @repo/env check-types` for types.

## Depends on / used by

Depends on `@t3-oss/env-core`, `zod` and `@repo/typescript-config`. Every package and app that reads configuration uses it.
