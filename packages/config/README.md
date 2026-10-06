# @repo/config

Global app constants and the colour theme, defined once.

## Why it exists

Web, native, API and emails must agree on the product's name, languages, links and colours. This package holds them in one place so they cannot drift. The reasoning is in [`docs/content/docs/packages/config.mdx`](../../docs/content/docs/packages/config.mdx).

TypeScript presets are not here: see [`@repo/typescript-config`](../typescript-config/README.md).

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/config/app` | `app`: name, description, languages, email sender and reply-to, links (paths), deep-link scheme, API base path |
| `@repo/config/theme` | `theme.colors.light` / `theme.colors.dark` (31 shadcn-named tokens each), `theme.radius`, `tokenNames`, `cssVariables()`, `themeVariableNames` |
| `@repo/config/contrast` | `contrastRatio(a, b)`, `TEXT_CONTRAST` (4.5), `GRAPHIC_CONTRAST` (3) |
| `@repo/config/web.css` | generated: shadcn variables, light in `:root`, dark under `.dark` |
| `@repo/config/native.css` | generated: Nativewind `@theme` and `:root` (light default) |
| `@repo/config/native-variables.json` | generated: the variable names, for the native Metro config |

`app` holds only what is the same in every environment. Web addresses differ between development, staging and production, so they are environment keys, not constants here.

## Use it

```ts
import { app } from "@repo/config/app";
import { theme } from "@repo/config/theme";

console.log(app.name, theme.colors.dark.primary);
```

To change a colour, edit `src/theme.ts` and run:

```bash
pnpm theme:generate
```

## Tests

`pnpm --filter @repo/config test`:

- `theme.test.ts`: every token has a `#rrggbb` value in both schemes, every text pair is at least 4.5:1 and every control or chart colour at least 3:1, the CSS variables match the tokens, and the generated files on disk equal what the generator would write.
- `contrast.test.ts`: the contrast calculation (black on white is 21, a published WCAG value, order does not matter, bad input is refused).
- `app.test.ts`: the default language is listed and every language has a name, the formatting locale and deep-link scheme are well formed, links are paths, and no web address is written in the constants.

`pnpm --filter @repo/config check-types` for types.

## Depends on / used by

No runtime dependencies (`@repo/typescript-config` for types only). Used by emails, the web and native apps and anything that shows the product's name or colours.
