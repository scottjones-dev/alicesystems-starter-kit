---
title: Environment variables
description: "Define each variable once: validation, the Infisical seed, the local .env and .env.example are all derived from it."
---

# Environment variables: plan

## Requirements
- A missing or malformed variable must stop the app at startup with the variable's name, not fail inside a request.
- Secrets live in Infisical (project `starterkit`). Nobody needs an Infisical account to run the project locally.
- Packages are optional. Removing one must not leave orphan keys behind.
- Server secrets must never reach a browser or mobile bundle.
- Adding a key must be a change in **one place**.

## Design
Every variable is defined once, next to the code that uses it, with `defineKeys`:

```ts
DATABASE_URL: {
  schema: z.url(),                 // validation
  folder: "/api",                  // Infisical folder it lives in
  description: "Postgres connection string",
  hint: "Neon or Supabase dashboard", // where a human gets it
  local: "postgres://postgres:postgres@localhost:5432/starterkit",
  auto: (environment) => ...,      // optional: a value we can fill in ourselves
}
```

From the definitions we derive:
1. **Validation**: the zod schemas go to t3-env (`keys.env()`).
2. **The Infisical seed**: a key with an `auto` value is generated; a required key without one is listed as "needs a real value" with its hint. A key whose schema accepts "unset" is never nagged about.
3. **The local `.env`** (`setup:local`): `local`, or else the `auto` value for dev.
4. **`.env.example`**: generated, and a test fails if the committed file is out of date.

A root `env.registry.ts` lists the packages' definitions (one line per package, not per key). The tools read it; packages never import the tools, so there is no dependency cycle.

## Environments
`dev`, `staging` and `prod` exist in every Infisical project. `test` is a custom environment (create it in Infisical with the slug `test`) for a shared, deployed test copy. Unit tests do not use Infisical: they use fake values in the test itself. Seeding `prod` needs `--yes`.

## Trade-offs
- This is a small abstraction of our own on top of t3-env. It earns its place by replacing four hand-synced lists. If it grows past a screenful, drop it and use plain t3-env with a hand-written `.env.example`.
- `env-core` is used, not `env-nextjs`, so the package has no Next.js dependency. Next.js apps add `env-nextjs` themselves for public keys.
- Seeding wraps the `infisical` CLI, so it needs the CLI and `infisical login`. Secrets never appear in our code or the process list.

## Scale
Config is read once at startup, so there is no runtime cost. The scaling concern is people and platforms: more keys, which is why each package owns its own.
