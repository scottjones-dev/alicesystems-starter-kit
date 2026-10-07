# native

The Expo app for phones and tablets (iOS and Android). Scaffolded with `pnpm create expo-app` (Expo SDK 57, Expo Router, the `default` template) and reduced to a blank app.

## Why it exists

Field service engineers, nursery staff and the pub till work on devices, often without a good connection. A native app can keep working offline and use the device (camera, notifications, location) in ways a web page cannot. The reasoning is in [`docs/content/docs/apps/native.mdx`](../../docs/content/docs/apps/native.mdx).

It is called `native`, not `mobile`, because it also runs on tablets and till hardware.

## What it does today

One screen showing the product name and description from `@repo/config`, styled with Tailwind classes. Sign-in arrives with `@repo/auth`, data from the [API](../api/README.md), and push with `@repo/notifications`.

## Run it

```bash
pnpm --filter native start    # Expo dev server; scan the QR code with a development build or Expo Go
pnpm --filter native android  # open on an Android emulator or device
pnpm --filter native ios      # macOS only
```

Add Expo-aware packages with `pnpm --filter native exec expo install <package>` so versions match the SDK, not with a plain `pnpm add`. Run `pnpm dlx expo-doctor` from this folder to check dependencies and config.

## Error reporting

`src/lib/observability.ts` starts Sentry with the shared options from [`@repo/observability`](../../packages/observability/README.md) (no replay, screenshots or view hierarchy; personal data scrubbed), and the root layout wraps the app so render errors and crashes are reported. Nothing is sent unless `EXPO_PUBLIC_SENTRY_DSN` is set. Metro uses Sentry's config and the Expo plugin targets the EU region, so release builds can upload source maps (needs `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`). Not run on a device or emulator; the bundle builds with `expo export`.

## Styling

Tailwind classes through **NativeWind 5** (`className`). The colours are the same ones as the website and emails: `src/global.css` imports `@repo/config/native.css` (generated from `packages/config/src/theme.ts` by `pnpm theme:generate`), and `ThemeProvider` swaps in the light or dark values from the shared theme to follow the device. Use the semantic classes: `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border`.

NativeWind 5 is a **release candidate**, so its versions are pinned exactly together: `nativewind` and `react-native-css` (5.0.0-rc.0 and 3.1.0-rc.0), Tailwind 4.1.12 and `lightningcss` 1.30.1. The `lightningcss` pin is also a workspace override in `pnpm-workspace.yaml`, because NativeWind fails to read `global.css` with other versions. Do not bump them one at a time.

`metro.config.js` is CommonJS on purpose (Expo loads it that way), so it uses `__dirname`, and Biome's rule against that is switched off for it in `biome.jsonc`: the rule's auto-fix would turn the file into an ES module and break it.

## Tests

`pnpm --filter native test`:

- `app-config.test.ts`: `app.json` and `@repo/config` agree on the product name, the slug, the deep-link scheme (which auth trusts for redirects) and the splash colour (`app.json` is plain JSON and cannot import the config, so this test stops them drifting); and the NativeWind wiring is in place (the stylesheet import, the Metro variable list, the PostCSS file).
- `scheme.test.ts`: the device setting maps to light or dark, with light as the default.

There are no tests for the screen: it only prints two constants. What was run by hand: `expo-doctor` (21 of 21 checks passed) and `expo export --platform android --no-bytecode` (Metro bundled it through NativeWind; the output contains both theme palettes and the compiled classes). It has **not** been run on an emulator or a device.

`pnpm --filter native check-types` for types.

## Notes on the scaffold

- Expo's `reset-project` script removed the demo screens (tabs, an animated icon, themed components) and was then deleted, with the unused packages the demo needed (animation, symbols, web support, glass effect, `@expo/ui`). Add them back with `expo install` when a screen needs them.
- `tsconfig.json` extends `@repo/typescript-config/expo.json`, and the repo's TypeScript is used. The scaffold's TypeScript pin, its `lint` script and `.vscode` settings (which would fight the repo's Biome setup) were removed.
- `AGENTS.md` and `.claude/settings.json` are Expo's own guidance for coding agents; keep them.
- Expo's `LICENSE` came with the template and is kept.
- The app icons and splash image are Expo's placeholders: each platform replaces them.

## Depends on / used by

Depends on `expo`, `expo-router`, `react-native`, `@repo/config`, `@repo/observability` and `@sentry/react-native`. Nothing depends on it.
