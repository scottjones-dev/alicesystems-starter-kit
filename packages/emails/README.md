# @repo/emails

Transactional emails as typed React components, rendered to HTML and plain text, in the recipient's language.

## Why it exists

Auth and notification emails must look the same everywhere, read in the person's language, and be sendable by any provider later. This package owns the templates and renders them. It does **not** send anything: delivery belongs to `@repo/notifications`. The reasoning is in [`docs/content/docs/packages/emails.mdx`](../../docs/content/docs/packages/emails.mdx).

## What's inside

```
src/
  templates/   verify-email, reset-password, magic-link, delete-account, organization-invitation
  components/  layout.tsx (the frame, footer links), action.tsx (button plus the link as text)
  registry.ts  every template with its props, preview props and subject; renderEmail()
  render.ts    renderElement() -> { html, text, subject }
  styles.ts    colours from @repo/config and every inline style; EMAIL_COLOR_SCHEME
  types.ts     EmailBaseProps (baseUrl, locale) and EmailDuration
```

Plain inline styles, no Tailwind. Text comes from the `emails` namespace of `@repo/internationalization`; brand name, support address and link paths come from `@repo/config`.

## Use it

```ts
import { renderEmail } from "@repo/emails/registry";

const { html, text, subject } = await renderEmail("magic-link", {
  baseUrl: "https://app.example.com", // the environment sending it: footer links use it
  expiresIn: { minutes: 15 },
  locale: user.locale, // falls back to English
  url: magicLinkUrl,
});
// hand html, text and subject to the sender (@repo/notifications)
```

## The look: light now, dark one line away

`@repo/config` has a light and a dark theme. Emails use **light**, set by `EMAIL_COLOR_SCHEME` in `src/styles.ts`. Change it to `"dark"` and every email follows, including the `color-scheme` meta that asks mail clients to leave the email alone. The tests check the colour pairs in both themes. Following the reader's system setting is not built.

Some mail apps (Gmail's mobile app, some Outlook versions) darken emails on their own, whatever the meta says.

## Adding a template

1. Add its text to `src/locales/<language>/emails.json` in `@repo/internationalization` (all six languages) and run `catalogs:generate` and `catalogs:check` there.
2. Create `src/templates/<id>.tsx` from an existing one: `EmailLayout`, `EmailAction`, a `PreviewProps` export, and a subject function.
3. Add it to `EmailPropsMap` and `registry` in `src/registry.ts`. The tests render it in every language automatically.

## Run it

| Command | What it does |
| --- | --- |
| `pnpm --filter @repo/emails preview` | React Email's preview server on `src/templates`, at <http://localhost:5000> (not part of `pnpm dev`). Untested here. |
| `pnpm --filter @repo/emails test` | the unit tests |

## Tests

`pnpm --filter @repo/emails test`:

- `registry.test.ts`: every template in every language (30 renders) has a subject, the right `lang`, the action link in both HTML and plain text, footer links on the sender's `baseUrl`, and nothing unfilled or `undefined`. Also subject translation and fallback, names in the invitation subject, lengths of time in the recipient's language, HTML escaping of typed names, the `color-scheme` meta, and no dark-mode stylesheet.
- `styles.test.ts`: the palette comes from the config theme, every colour pair is readable (4.5:1) in **both** themes, and switching the theme restyles every email.

`pnpm --filter @repo/emails check-types` for types.

## Depends on / used by

Depends on `@react-email/components`, `@react-email/render`, `react`, `@repo/config` and `@repo/internationalization` (`react-email` for the preview). Used by `@repo/notifications` and `@repo/auth` (not built yet).
