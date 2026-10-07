# product-docs

The documentation site for the product you build on this template: what it does and how to use it, for your users. Fumadocs on Next.js, set up with `create-fumadocs-app`.

This is **not** the template's own developer documentation: that is the root `docs/` workspace (port 1000), which explains the packages and decisions behind the template.

## Why it exists

Every product needs help pages for its users. They are written as MDX files, searchable, and styled with the same theme as the website and the platform, so they look like part of the product.

## Run it

```bash
pnpm --filter product-docs dev      # http://localhost:4000
pnpm --filter product-docs build
```

Write pages in `content/docs/*.mdx`; order them with a `meta.json` in the same folder.

## How it shares the web look

- `src/app/global.css` imports `@repo/ui/globals.css` (the shared Tailwind setup and `@repo/config` colours) and then Fumadocs' `shadcn.css`, which makes Fumadocs use those colours instead of its own. Change a colour in `@repo/config` and the docs follow.
- `components.json` points the shadcn CLI at `@repo/ui`, as in the website, so the Fumadocs CLI (`pnpm dlx @fumadocs/cli add ...`) reuses the shared `button`, `popover` and so on instead of installing copies.
- Light and dark are handled by Fumadocs' own provider (the same `dark` class on `<html>`), so `@repo/ui`'s `ThemeProvider` is not used here.
- The product name comes from `@repo/config`.

## What's inside

```
content/docs/       the pages (MDX) and meta.json ordering
src/app/            layout, docs pages, search API, llms.txt and OG image routes
src/lib/source.ts   loads the content; shared.ts holds names and routes
```

## Tests

None: this is content and Fumadocs' own wiring. `pnpm --filter product-docs build` type-checks and builds every page, and `pnpm --filter product-docs check-types` checks types alone.

## Depends on / used by

Depends on `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `@repo/ui` and `@repo/config`. Nothing depends on it.
