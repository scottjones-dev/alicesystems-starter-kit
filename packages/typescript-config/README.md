# @repo/typescript-config

Shared `tsconfig` presets. Every workspace extends one instead of repeating compiler options, so strictness stays the same everywhere.

## Presets

| File | Use it for |
| --- | --- |
| `base.json` | The strict defaults every other preset builds on. Not used directly. |
| `node.json` | Node services, scripts and data packages (API, db, env). Type-check only. |
| `nextjs.json` | Next.js apps. |
| `react-library.json` | Shared React packages (UI). Type-check only. |
| `expo.json` | Expo / React Native apps. |

`base.json` turns on `strict` and `noUncheckedIndexedAccess`, so `array[0]` is typed `T | undefined` and must be checked.

## Usage

Add the package to the workspace, then extend a preset in its `tsconfig.json`:

```bash
pnpm add -D @repo/typescript-config --filter <workspace> --workspace
```

```json
{
  "extends": "@repo/typescript-config/node.json",
  "include": ["src"]
}
```

Per-app settings (`paths`, `include`) stay in the app's own `tsconfig.json`; the presets hold no paths.

## Tests

None. The package is JSON only, so there is no logic to test. Each preset is exercised by the `check-types` task of the workspaces that extend it.

## Depends on / used by

Depends on nothing. Used by every app and package under `apps/` and `packages/`.
