# @repo/internationalization

Translation catalogs and the helpers that pick a language and format values, shared by the server, the website and the native app.

## Why it exists

Every sentence a person reads must come from a translation file, so it can be translated once and used everywhere. This package holds those files and the small amount of logic around them. It uses i18next, with the same file format on all platforms. The reasoning is in [`docs/content/docs/packages/internationalization.mdx`](../../docs/content/docs/packages/internationalization.mdx).

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/internationalization/core` | `getT(locale, namespace)` for server code, `getI18n()`, `i18nextOptions()` for building your own i18next instance (website, app) |
| `@repo/internationalization/resolve` | `Locale`, `locales`, `defaultLocale`, `toLocale()`, `parseAcceptLanguage()`, `resolveLocale()` |
| `@repo/internationalization/format` | `formatDate()`, `formatDateTime()`, `formatNumber()`, `formatMoney()`, `formatList()`, `intlLocale()` |
| `@repo/internationalization/resources` | the bundled catalogs (generated), `namespaces`, `defaultNamespace` |

Catalogs: `src/locales/<language>/<namespace>.json`. English is the source. The languages are listed once, in `@repo/config` (`app.i18n.locales`); the template ships English, Spanish, German, French, Portuguese and Chinese.

> **The non-English catalogs are machine-written and have not been checked by native speakers.** Check them before a platform goes live. Portuguese is written for Brazil; German uses the informal "du".

## Use it

```ts
import { getT } from "@repo/internationalization/core";
import { formatMoney } from "@repo/internationalization/format";
import { resolveLocale } from "@repo/internationalization/resolve";

const locale = resolveLocale({ user: session.user.locale, acceptLanguage });
const t = getT(locale, "errors"); // falls back to English
t("NOT_FOUND");
formatMoney(1999, "GBP", locale); // "£19.99" (decimals come from @repo/money)
```

`resolveLocale` picks, in order: the signed-in user's saved language, the cookie, the `Accept-Language` header, the device language, then English. Money is always a whole number of minor units.

## Run it

| Command | What it does |
| --- | --- |
| `pnpm --filter @repo/internationalization catalogs:generate` | Rewrites `src/resources.ts` from the folders in `src/locales`. Run it after adding or removing a language or namespace. |
| `pnpm --filter @repo/internationalization catalogs:check` | Fails if a language is incomplete or inconsistent. |
| `pnpm --filter @repo/internationalization translate` | Asks Languine to translate what changed in English. Needs `LANGUINE_API_KEY` and `LANGUINE_PROJECT_ID` (Infisical `/internationalization`, then `pnpm env:pull`). If it says "not logged in", run `pnpm dlx languine@latest auth login` once. **Untested**; read what it writes before committing. |

To add a language: add it to `app.i18n.locales` and `names` in `@repo/config`, add its folder under `src/locales` (copy `en`), add it to `languine.json`, run `catalogs:generate`, and translate.

## Tests

`pnpm --filter @repo/internationalization test`:

- `resolve.test.ts`: language tags, `Accept-Language` weights, and the order of `resolveLocale`.
- `format.test.ts`: dates, numbers, lists and money in several languages and currencies (GBP, JPY, BHD), HUF (shown with decimals although Intl shows none), and refusal of fractional minor units.
- `core.test.ts`: `getT` per language and namespace, fallback to English, instance reuse, empty translations treated as missing.
- `catalog-check.test.ts`: the checks, on made-up languages (Polish plural forms, Chinese's single form, mismatched placeholders, markup, email addresses).
- `catalogs.test.ts`: the real catalogs are complete, there is one error message per `@repo/errors` code, and `languine.json` matches the language list.
- `resources-source.test.ts`: the generator, plus a check that `resources.ts` is up to date.

`pnpm --filter @repo/internationalization check-types` for types.

## Depends on / used by

Depends on `i18next`, `@repo/config` (the language list), `@repo/money` (decimals per currency for `formatMoney`) and `@repo/env` (`LANGUINE_API_KEY`, `LANGUINE_PROJECT_ID`); `@repo/errors` is a dev dependency (a test checks every error code has a message). Used by emails, notifications, auth and the web and native apps (not built yet).
