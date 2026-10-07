# @repo/docs

The documentation site for the product's **end users**: how to use the website, the web app and the mobile app, written for people who use the product, not people who build it. Fumadocs on Next.js, set up with `create-fumadocs-app`.

This is **not** the template's own developer documentation: that is the root `docs/` workspace (port 1000), which explains the packages and decisions behind the template.

## Why it exists

Every product needs help pages for its users. They are written as MDX files, searchable, and styled with the same theme as the website and the platform, so they look like part of the product.

## Run it

```bash
pnpm --filter @repo/docs dev      # http://localhost:4000
pnpm --filter @repo/docs build
```

Write pages in `content/docs/*.mdx`; order them with `meta.json` in the same folder. Keep them in plain language and about what a user can do. Pages for features that are not built yet say **Coming soon**; replace those notes as each feature ships, and update the pages in the same change as the feature.

Current pages: Welcome, The website, The web app, The mobile app, Language and appearance, Emails and notifications, Your privacy, Help and support. The home page (`/`) redirects to `/docs`.

## Visual editor (dev only)

While `pnpm dev` is running, open `http://localhost:4000/editor/<page>` to edit `content/docs/<page>.mdx` visually (`/editor` edits `index.mdx`). Changes are saved to the file as you type, so review them in Git. It uses `@fumadocs-editor/ui`.

- `src/app/editor/[[...slug]]/page.tsx` reads the file and shows the editor; `src/components/doc-editor.tsx` is the client component that posts each change to `src/app/api/editor/route.ts`, which writes the file.
- `src/lib/editor-files.ts` maps a URL to a file and refuses anything outside `content/docs`. The page and API return 404 in production builds.
- It edits existing pages only; create, rename and delete files in your code editor.
- Alternatively, `npx @fumadocs-editor/studio` (Node.js 24+) opens the same content without any code in the app.

## How it shares the web look

- `src/app/global.css` imports `@repo/ui/globals.css` (the shared Tailwind setup and `@repo/config` colours) and then Fumadocs' `shadcn.css`, which makes Fumadocs use those colours instead of its own. Change a colour in `@repo/config` and the docs follow.
- `components.json` points the shadcn CLI at `@repo/ui`, as in the website, so the Fumadocs CLI (`pnpm dlx @fumadocs/cli add ...`) reuses the shared `button`, `popover` and so on instead of installing copies.
- Light and dark are handled by Fumadocs' own provider (the same `dark` class on `<html>`), so `@repo/ui`'s `ThemeProvider` is not used here.
- The product name comes from `@repo/config`.

## What's inside

```
content/docs/       the pages (MDX) and meta.json ordering
src/app/            layout, docs pages, search API, llms.txt and OG image routes, dev-only /editor
src/lib/source.ts   loads the content; shared.ts holds names and routes
```

## GitHub links

`gitConfig` in `src/lib/shared.ts` says where the source lives (`scottjones-dev/alicesystems-starter-kit`, branch `master`). The header icon links to the repo, and each page's "View options" menu links to that page's file through `getPageGithubUrl`. `contentPath` (`apps/docs/content/docs`) is the pages' folder from the repo root, because this site is one workspace in a monorepo. Change it if the folder moves, or the links will 404.

## Tests

`pnpm --filter @repo/docs test` runs Vitest on the editor's path-safety check (`src/lib/editor-files.test.ts`) and on `getPageGithubUrl` (`src/lib/shared.test.ts`). The rest is content and Fumadocs' own wiring. `pnpm --filter @repo/docs build` type-checks and builds every page, and `pnpm --filter @repo/docs check-types` checks types alone.

## Depends on / used by

Depends on `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `@fumadocs-editor/ui`, `@repo/ui` and `@repo/config`. Nothing depends on it.
