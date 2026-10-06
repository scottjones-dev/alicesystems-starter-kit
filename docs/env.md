# Environment variables: plan

## Requirements
- A missing or malformed variable must stop the app at startup with the variable's name, not fail inside a request.
- Secrets live in Infisical (project `starterkit`). Nobody should need an Infisical account to run the project locally.
- Packages are optional. Removing one must not leave orphan keys behind.
- Server secrets must never reach a browser or mobile bundle.

## Design
1. **`@repo/env`** holds only the shared pieces:
   - `create-env.ts`: `createServerEnv(shape)`, a thin wrapper over `@t3-oss/env-core` with the repo's defaults (empty string counts as unset, `SKIP_ENV_VALIDATION` turns validation off for CI builds).
   - `base.ts`: the keys every runtime has (`NODE_ENV`).
   - `seed/`: fills a new Infisical environment with every key we can generate. It never overwrites a key.
   - `local/`: writes a root `.env` for running on one machine with no accounts.
2. **Each future package owns its keys** in its own `keys.ts` (the next-forge idea): `db` declares `DATABASE_URL`, `auth` declares `BETTER_AUTH_SECRET`. An app combines the ones it needs with t3's `extends`.
3. **Seed and local setup grow with the packages.** When a package adds a key, it adds that key to `seed/plan.ts` and `local/plan.ts` and to the root `.env.example`, in the same change. Docker Postgres and S3 defaults arrive with the `db` and `storage` packages, not before.
4. **Fail fast in production.** A value that would silently fall back to a development default (a localhost URL) is required in production instead.

## Trade-offs
- Colocated `keys.ts` means a package is self-contained, but the full list of variables is spread across packages. `.env.example` is the single readable list, so keeping it current is part of every change.
- `env-core` is used (not `env-nextjs`) so the package has no Next.js dependency. Next.js apps add `env-nextjs` themselves for their public keys.
- Seeding wraps the `infisical` CLI instead of its API, so it needs the CLI installed and `infisical login`. That keeps secrets out of our code and process list.

## Scale
Config is read once at startup, so there is no runtime cost. The only scaling concern is people: more platforms means more keys, which is why each package owns its own.
