# my-template

A bare pnpm + Turborepo monorepo. It is the base for new platforms (apps and shared packages are added on top of it).

## What's here

| Path | Purpose |
| --- | --- |
| `packages/typescript-config` | Shared `tsconfig` presets (`@repo/typescript-config`). |
| `packages/env` | Typed, validated environment variables plus Infisical seeding and local setup (`@repo/env`). |
| `env.registry.ts` | Lists the packages whose environment keys the `@repo/env` tools read. |
| `packages/errors` | The error codes, `AppError` and JSON error body every API response uses (`@repo/errors`). |
| `packages/db` | Drizzle on Postgres: client, column helpers, migrations, test database helper (`@repo/db`). |
| `infra/postgres` | Local PostgreSQL 18 in Docker. |
| `packages/config` | Global app constants and the light and dark colour theme, with generated web and native stylesheets (`@repo/config`). |
| `packages/internationalization` | Translation catalogs for six languages, language choice and formatting (`@repo/internationalization`). |
| `packages/emails` | Typed React email templates rendered to HTML and plain text, in the recipient's language (`@repo/emails`). |
| `packages/notifications` | `notify()` over swappable transports: Novu in production, a local Mailpit inbox in development (`@repo/notifications`). |
| `infra/mailpit` | Local mail inbox in Docker. |
| `packages/analytics` | Privacy-first event catalog and rules for PostHog (EU), shared by web and native (`@repo/analytics`). |
| `apps/api` | The Hono API: request ids, one error contract, health routes, OpenAPI reference. |
| `packages/ui` | The web design system: 22 shadcn components on the shared theme, light and dark (`@repo/ui`). |
| `apps/storybook` | Storybook: every UI component on its own page, in light and dark. |
| `apps/website` | The public Next.js website. |
| `apps/platform` | The signed-in Next.js app (its address is `WEB_ORIGIN`). |
| `apps/native` | The Expo (SDK 57) app for phones and tablets. |
| `apps/` | Deployable apps (web, api, native...). Empty for now. |
| `packages/` | Shared code used by apps. Empty for now. |
| `pnpm-workspace.yaml` | Tells pnpm that `apps/*` and `packages/*` are workspaces. |
| `turbo.json` | Turborepo tasks: `build`, `dev`, `test`, `check-types`. |
| `biome.jsonc` | Lint and format rules (Biome through Ultracite). |
| `.husky/`, `.lintstagedrc.json` | Pre-commit hook that runs `ultracite fix` on staged files. |
| `AGENTS.md` | Project rules and code standards for people and AI agents. |

## Usage

```bash
pnpm install
pnpm dev          # run every workspace's dev task
pnpm build
pnpm test
pnpm check-types
pnpm check        # lint and format check (Biome via Ultracite)
pnpm fix          # auto-fix
```

Add an app with its scaffolder, for example `cd apps && pnpm dlx create-next-app@latest web --src-dir`. Add a workspace dependency with `pnpm add @repo/ui --filter web --workspace`. Then add a README for the new workspace and list it in the table above.

## Tests

There are no workspaces yet, so there is nothing to test. Each new workspace adds its own `test` script (Vitest) and `turbo run test` runs them all.

## Depends on / used by

Depends on Node, pnpm, Turborepo, Biome and Ultracite. Everything under `apps/` and `packages/` builds on it.
