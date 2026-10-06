# @repo/env

Typed, validated environment variables, defined once, plus the tools that fill them in.

## Why it exists

Bad or missing config should fail at startup with a clear message, not deep inside a request. And a key should be added in **one place**: from a single definition this package derives the validation, the Infisical seed, the local `.env` and `.env.example`. The reasoning is in [`docs/content/docs/env.md`](../../docs/content/docs/env.md).

## What's inside

| File | What it does |
| --- | --- |
| `src/define.ts` | `defineKeys` (declare keys), `createServerEnv` (validate), `randomSecret`, the environment and folder lists. |
| `src/load.ts` | `loadRootEnv()`: loads the root `.env` for tools that run outside an app (database commands, integration tests). Variables already in the shell win. |
| `src/base.ts` | The keys every runtime has: `NODE_ENV`, `SKIP_ENV_VALIDATION`. |
| `src/plan.ts` | Pure functions that build the seed plan, the local `.env` and `.env.example` from the definitions. |
| `src/cli.ts` | The three commands, thin glue over `plan.ts` and the `infisical` CLI. |
| `../../env.registry.ts` | The list of packages whose keys the tools read. |

## Define keys

A package declares its keys next to its code. One definition holds everything about a key:

```ts
import { defineKeys } from "@repo/env/define";
import { z } from "zod";

export const keys = defineKeys({
  DATABASE_URL: {
    schema: z.url(),                 // validation; accepting undefined makes a key optional
    folder: "/api",                  // Infisical folder
    description: "Postgres connection string",
    hint: "Neon or Supabase dashboard",
    local: "postgres://postgres:postgres@localhost:5432/starterkit", // for setup:local
    // auto: (environment) => "...", // optional: a value we can fill in ourselves
  },
});
```

Then add one line to the root `env.registry.ts` (`registry = [base, ...]`) and run `pnpm env:example`. Use `auto: randomSecret` for signing secrets, or a function that returns a localhost URL for `dev` and `undefined` elsewhere.

## Read keys

```ts
import { keys } from "@repo/env/base";

const env = keys.env(); // throws at startup, naming any bad variable
console.log(env.NODE_ENV);
```

Nothing is validated until `.env()` is called, so the tools can read definitions without side effects.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm secrets:seed <dev\|test\|staging\|prod> [--dry-run] [--yes]` | Fills an Infisical environment. |
| `pnpm setup:local [--force]` | Writes a root `.env` for running with no accounts. |
| `pnpm env:pull <dev\|test\|staging\|prod> [--force]` | Writes the root `.env` from Infisical (run `pnpm secrets:seed` first so the folders exist). |
| `pnpm env:example` | Regenerates the root `.env.example`. `--check` fails if it is out of date. |

### Seeding Infisical

Needs the `infisical` CLI on your PATH and a one-time `infisical login` (run `infisical init` in the repo root to link the `starterkit` project). `dev`, `staging` and `prod` exist in every Infisical project; `test` is a custom environment, so create it in Infisical with the slug `test` before seeding it. Unit tests do not use Infisical: they set their own fake values.

Per environment it creates the `/api`, `/web` and `/native` folders if missing, adds any **missing** key that has an `auto` value (it never overwrites an existing key), and lists the required keys that still need a real value, with their hint. Optional keys are never listed. Values reach Infisical through a temporary owner-only file and are never printed. Seeding `prod` needs `--yes`, so run `--dry-run` first.

`pnpm secrets:push` (root script) sends **every** key in the root `.env` to Infisical `dev /api` and **overwrites** existing ones.

## Tests

`pnpm --filter @repo/env test`:

- `define.test.ts`: validation (typed values, defaults, empty strings, missing and malformed values, the skip switch), `defineKeys`, `isRequired`, `randomSecret` and the base keys.
- `load.test.ts`: `loadRootEnv` (loads a file, never overrides the shell, no file) and `findRepoRoot`.
- `plan.test.ts`: the seed plan, local `.env` and `.env.example` against a sample set of keys, duplicate-key detection, and a check that the committed `.env.example` matches the real definitions.

`cli.ts` is glue over the `infisical` CLI and the file system, so it is not unit tested; check the seed with `--dry-run`.

`pnpm --filter @repo/env check-types` for types.

## Depends on / used by

Depends on `@t3-oss/env-core`, `zod` and `@repo/typescript-config`. Every package and app that reads configuration uses it.
