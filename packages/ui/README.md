# @repo/ui

The web design system: shadcn/ui components on the shared theme, for the website and the platform app. **Web only.** The native app styles itself with NativeWind and shares only the colours.

## Why it exists

One place for the look and feel of every web screen: the same buttons, forms and dialogs, in the same colours, written once. It is laid out the way shadcn's own monorepo layout is (the CLI generated it), so the shadcn CLI keeps working and updating a component is one command. The reasoning is in [`docs/content/docs/packages/ui.mdx`](../../docs/content/docs/packages/ui.mdx). To see every component, run [Storybook](../../apps/storybook/README.md).

## What's inside

| Path | What it is |
| --- | --- |
| `src/components/*.tsx` | the shadcn components (22), written by the shadcn CLI. **Do not hand-edit them**: re-add or update with the CLI. They are excluded from lint for that reason. |
| `src/styles/globals.css` | Tailwind setup, and the mapping from the theme's colours to Tailwind colours |
| `src/providers/theme-provider.tsx` | `ThemeProvider`: light and dark mode (follows the device, remembers a choice) |
| `src/lib/utils.ts` | `cn()`, joins class names |
| `postcss.config.mjs` | the PostCSS setup the apps re-export |
| `components.json` | tells the shadcn CLI where things go |

The 22 components are the core set: button, input, label, textarea, select, checkbox, radio-group, switch, field, card, dialog, dropdown-menu, popover, tabs, table, badge, alert, avatar, separator, skeleton, tooltip, sonner (toasts). They use **Radix** (shadcn's `radix-nova` style).

```tsx
import "@repo/ui/globals.css"; // once, in the app's root layout
import { Button } from "@repo/ui/components/button";
import { ThemeProvider } from "@repo/ui/providers/theme-provider";
```

## The theme

The colours are `@repo/config`'s theme, not defined here: `globals.css` imports `@repo/config/web.css` (generated from `packages/config/src/theme.ts` by `pnpm theme:generate`) and maps each token to a Tailwind colour (`bg-background`, `text-muted-foreground`, `bg-primary`). Dark mode is the `dark` class on `<html>`, set by `ThemeProvider`. Change a colour in the config and every web app, Storybook, the native app and the emails follow.

## Add a component

Run the shadcn CLI from the website, which holds the `components.json` that points here:

```bash
cd apps/website
pnpm dlx shadcn@latest add accordion
```

The file lands in `src/components`. Then:

1. Check the new library it needs is in **this** package's `package.json`, not the website's. The CLI puts it in the website; move it (`pnpm --filter website remove <lib>` then `pnpm --filter @repo/ui add <lib>`).
2. Add a story for it in `apps/storybook/stories/<name>.stories.tsx`. A test fails if a component has no story.

## Tests

`pnpm --filter @repo/ui test`: the wiring. `components.json` (here and in the website) points where the package exports; `globals.css` imports the shared theme and maps **every** colour token in `@repo/config` (so adding a token there fails here until it is mapped); dark mode uses the `dark` class; and `cn` joins and resolves conflicting classes. The components themselves are the CLI's code: they are rendered by the Storybook tests, and the theme's contrast is tested in `@repo/config`.

`pnpm --filter @repo/ui check-types` for types.

## Depends on / used by

Depends on `radix-ui`, `class-variance-authority`, `lucide-react`, `next-themes`, `sonner`, `tailwindcss` and `@repo/config`. Used by `apps/website`, `apps/platform` and `apps/storybook`.
