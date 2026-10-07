# platform

The signed-in web app: where tenants and their staff use the product. Scaffolded with `pnpm create next-app` (App Router, `src/`, Tailwind) and fitted into the monorepo.

## Why it exists

Everything behind a sign-in (the product itself, organization settings, billing) lives here, separate from the public [website](../website/README.md), so each can be deployed, cached and secured on its own terms. The reasoning is in [`docs/content/docs/apps/platform.mdx`](../../docs/content/docs/apps/platform.mdx).

## What it does today

One page showing the product name, built with the shared components and theme from [`@repo/ui`](../../packages/ui/README.md). Sign-in arrives with `@repo/auth`, data from the [API](../api/README.md).

## Run it

```bash
pnpm --filter platform dev    # http://localhost:8000
pnpm --filter platform build
```

Port 8000 is `WEB_ORIGIN` in the environment: the one browser origin the API allows through CORS, and the address emails link back to.

## Tests

None yet: there is no logic of its own, only a page that prints constants. `pnpm --filter platform build` type-checks and builds it, and `pnpm --filter platform check-types` checks types alone. Tests come with the first real logic.

## Notes on the scaffold

The same changes as the website: generated `pnpm-workspace.yaml`, `biome.json` and pinned TypeScript removed, `tsconfig.json` extends `@repo/typescript-config/nextjs.json`, `transpilePackages` lists the workspace packages it imports, and `AGENTS.md` and `CLAUDE.md` are kept.

## Depends on / used by

Depends on `next`, `react` and `@repo/config`. Nothing depends on it.
