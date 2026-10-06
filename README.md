# my-template

A bare pnpm + Turborepo monorepo. It is the base for new platforms (apps and shared packages are added on top of it).

## What's here

| Path | Purpose |
| --- | --- |
| `packages/typescript-config` | Shared `tsconfig` presets (`@repo/typescript-config`). |
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
