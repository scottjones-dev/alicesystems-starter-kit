# storybook

Every UI component on its own page, in light and dark. Storybook 10 with React and Vite, set up with `pnpm create storybook`.

## Why it exists

Components are easier to build, review and test when you can see each one by itself, in every state, without logging in or reaching it through a product screen. It is a separate workspace (like next-forge's) so it can be built and hosted on its own. The reasoning is in [`docs/content/docs/apps/storybook.mdx`](../../docs/content/docs/apps/storybook.mdx).

## Run it

```bash
pnpm --filter storybook storybook    # http://localhost:6000
pnpm --filter storybook build        # static site in storybook-static/
```

The toolbar has a **light/dark** switch. It sets the same `dark` class on `<html>` that the web apps' `ThemeProvider` sets, on the real theme from `@repo/config`. The **Accessibility** panel checks each story with axe.

## What's inside

```
.storybook/
  main.ts        stories, addons (a11y, docs, themes), the React + Vite framework
  preview.tsx    loads @repo/ui's stylesheet, the light/dark switch, and the tooltip and toast providers
  preview.css    system-font fallbacks for the two font variables the web apps get from next/font
stories/         one *.stories.tsx per component in @repo/ui (22)
test/            the story tests
```

Stories are written next to this app, not in `@repo/ui`, so the design system package stays free of Storybook's dependencies.

## Add a story

When a component is added to `@repo/ui`, add `stories/<component>.stories.tsx`: a `meta` titled `ui/<Name>` with `tags: ["autodocs"]`, and one story per meaningful state. Copy a similar existing story.

## Tests

`pnpm --filter storybook test`:

- **a story for every component:** fails if a file in `packages/ui/src/components` has no story, and the other way round;
- **every story renders** without throwing and without a console error, in jsdom with a few browser features stubbed (`test/setup.ts`).

`pnpm --filter storybook check-types` for types.

Not covered: how it looks. The tests prove a story renders, not that it renders well; use the Storybook UI and its accessibility panel for that. Browser-based and visual-regression tests (Playwright, Chromatic) are not set up.

## Notes on the setup

- Next-forge's Storybook uses the Next.js framework. These components are plain React with nothing Next-specific, so this one uses React with Vite: faster, and no Next app needed to host it.
- `pnpm create storybook` could not finish configuring its addons during a no-install run; they are listed in `.storybook/main.ts` by hand.
- It is not part of `pnpm dev` (it would start a dev server on every run); start it when you want it.

## Depends on / used by

Depends on `storybook`, `@storybook/react-vite`, `@repo/ui` and its addons. Nothing depends on it.
