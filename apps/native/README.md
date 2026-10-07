# native

The Expo app for phones and tablets (iOS and Android). Scaffolded with `pnpm create expo-app` (Expo SDK 57, Expo Router, the `default` template) and reduced to a blank app.

## Why it exists

Field service engineers, nursery staff and the pub till work on devices, often without a good connection. A native app can keep working offline and use the device (camera, notifications, location) in ways a web page cannot. The reasoning is in [`docs/content/docs/apps/native.mdx`](../../docs/content/docs/apps/native.mdx).

It is called `native`, not `mobile`, because it also runs on tablets and till hardware.

## What it does today

One screen showing the product name and description from `@repo/config`. Sign-in arrives with `@repo/auth`, data from the [API](../api/README.md), and push with `@repo/notifications`.

## Run it

```bash
pnpm --filter native start    # Expo dev server; scan the QR code with a development build or Expo Go
pnpm --filter native android  # open on an Android emulator or device
pnpm --filter native ios      # macOS only
```

Add Expo-aware packages with `pnpm --filter native exec expo install <package>` so versions match the SDK, not with a plain `pnpm add`. Run `pnpm dlx expo-doctor` from this folder to check dependencies and config.

## Tests

`pnpm --filter native test`: `app-config.test.ts` checks that `app.json` and `@repo/config` agree on the product name, the slug, the deep-link scheme (which auth trusts for redirects) and the splash colour. `app.json` is plain JSON and cannot import the config, so this test is what stops them drifting.

There are no tests for the screen: it only prints two constants. What was run by hand: `expo-doctor` (21 of 21 checks passed) and `expo export --platform android` (Metro bundled it, with `@repo/config` resolved from the workspace). It has **not** been run on an emulator or a device.

`pnpm --filter native check-types` for types.

## Notes on the scaffold

- Expo's `reset-project` script removed the demo screens (tabs, an animated icon, themed components) and was then deleted, with the unused packages the demo needed (animation, symbols, web support, glass effect, `@expo/ui`). Add them back with `expo install` when a screen needs them.
- `tsconfig.json` extends `@repo/typescript-config/expo.json`, and the repo's TypeScript is used. The scaffold's TypeScript pin, its `lint` script and `.vscode` settings (which would fight the repo's Biome setup) were removed.
- `AGENTS.md` and `.claude/settings.json` are Expo's own guidance for coding agents; keep them.
- Expo's `LICENSE` came with the template and is kept.
- The app icons and splash image are Expo's placeholders: each platform replaces them.
- Styling (Nativewind with the generated `@repo/config/native.css`) is not set up yet.

## Depends on / used by

Depends on `expo`, `expo-router`, `react-native`, `@repo/config`. Nothing depends on it.
