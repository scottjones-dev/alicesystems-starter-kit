# website

The public marketing website. Scaffolded with `pnpm create next-app` (App Router, `src/`, Tailwind) and fitted into the monorepo.

## Why it exists

Visitors need a public home for the product that does not require signing in: what it is, pricing, legal pages. The signed-in product is the [platform](../platform/README.md). The reasoning is in [`docs/content/docs/apps/website.mdx`](../../docs/content/docs/apps/website.mdx).

## What it does today

One page showing the product name and description from `@repo/config`. It uses the shared components and theme from [`@repo/ui`](../../packages/ui/README.md) (set up in `src/app/layout.tsx`). Real pages and analytics arrive with their packages.

## Run it

```bash
pnpm --filter website dev    # http://localhost:3000
pnpm --filter website build
```

## Tests

None yet: there is no logic of its own, only a page that prints two constants. `pnpm --filter website build` type-checks and builds it, and `pnpm --filter website check-types` checks types alone. Tests come with the first real logic.

## Notes on the scaffold

- The generated `pnpm-workspace.yaml`, `biome.json` and the pinned TypeScript were removed: the repo root owns lint (Biome through Ultracite), TypeScript and the workspace.
- `tsconfig.json` extends `@repo/typescript-config/nextjs.json`.
- `next.config.ts` lists `@repo/config` in `transpilePackages`, because workspace packages ship TypeScript source. Add each shared package the app imports.
- `AGENTS.md` and `CLAUDE.md` are Next.js's own guidance for coding agents; keep them.

## Depends on / used by

Depends on `next`, `react` and `@repo/config`. Nothing depends on it.
