# @repo/notifications

One function, `notify()`, to tell a user something. Email today, push (Expo) for events that define it, SMS later.

## Why it exists

Auth and the API should never know which channel, provider or template is behind a message. Callers say _what happened_ and _who to tell_; this package decides the rest. The reasoning is in [`docs/content/docs/packages/notifications.mdx`](../../docs/content/docs/packages/notifications.mdx).

```
notify("magic-link", { to, payload })
   |  validates the data against the event's schema
   v
transport, chosen once at startup by NOTIFICATIONS_TRANSPORT
   novu  (staging, production)  Novu runs the workflow -> calls our /api/novu bridge -> delivers
   smtp  (development)          renders the email here -> Mailpit inbox at http://localhost:8025
   log   (tests)                records what would have been sent
```

## Use it

```ts
import { notify } from "@repo/notifications/notify";

void notify("magic-link", {
  to: { email: user.email, locale: user.locale, subscriberId: user.id },
  payload: { expiresIn: { minutes: 15 }, url },
  idempotencyKey: `magic-link:${user.id}:${attemptId}`, // optional
});
```

- The event id decides the payload type, so a missing field is a compile error. The data is also validated at run time.
- `notify()` never throws and never logs the payload, address or user. Use `void notify(...)` inside auth callbacks so response time does not reveal whether an account exists.
- Importing `@repo/notifications/notify` reads the environment and **throws at startup** on a bad setup (production without `NOVU_SECRET_KEY`, or a transport other than `novu` in production).
- Someone without an account (an invitee): leave out `subscriberId`; one is made from their address.

## What's inside

```
src/
  events.ts           catalog: the five emails, their data schemas, critical flag, optional push
  notify.ts           createNotify(): validate, then hand to a transport; never throws
  transports.ts       novu, smtp and log transports
  select-transport.ts picks one from configuration and refuses unsafe combinations
  instance.ts         the app's notify(), built from the environment  (@repo/notifications/notify)
  workflows.ts        builds the Novu workflows from the catalog (email step, push step if defined)
  bridge.ts           the handler Novu calls: mount it in the API at /api/novu
  devices.ts          Expo push tokens on the Novu subscriber
  client.ts           Novu client and region URLs
  keys.ts             environment keys
  scripts/dev.ts      `pnpm novu:tunnel`
```

## Add a notification

1. Add the email template in `@repo/emails` (and its text in `@repo/internationalization`).
2. Add an entry to `events` in `src/events.ts`: data schema (it must match the email's props without `baseUrl`), `critical`, and an optional `push` message.
3. The tests check the catalog and the email templates match exactly.

## Run it locally

```bash
pnpm infra:mailpit:up        # the inbox: http://localhost:8025
pnpm setup:local             # writes .env with NOTIFICATIONS_TRANSPORT=smtp, SMTP_HOST, SMTP_PORT, EMAIL_FROM_ADDRESS
```

To try the real Novu path on your machine you need a Novu account: put `NOVU_SECRET_KEY` and `NOVU_REGION` in Infisical, set `NOTIFICATIONS_TRANSPORT=novu`, run the API, and run `pnpm novu:tunnel` in a second terminal (`--port 9000` by default, `--open` for the dashboard). In Novu's dashboard add an email integration (for example Resend) and, for push, an Expo Push integration. **This path is untested here:** only its unit tests have run.

## Push devices

```ts
import { registerDevice, unregisterDevice } from "@repo/notifications/devices";

await registerDevice(user.id, expoPushToken); // on sign-in from the app
await unregisterDevice(user.id, expoPushToken); // on sign-out
```

Tokens live on the Novu subscriber (max 100), which the first notification to that user creates, so register after that. With no Novu key (development) both do nothing; in production a missing key is an error.

## Tests

`pnpm --filter @repo/notifications test` (no network):

- `events.test.ts`: one event per email template; each accepts its email's preview data and rejects bad data; every event renders, in the recipient's language; which events are critical.
- `notify.test.ts`: the transport gets the right data, the language is worked out, an invitee gets a subscriber id, failures never throw, and the log holds no payload, address or user.
- `transports.test.ts`: SMTP renders and addresses the email (sender, reply-to, language, footer links on the environment's address); Novu gets the right trigger; the log transport records.
- `select-transport.test.ts`: every combination, including refusing smtp or log in production and novu without a key.
- `workflows.test.ts`: one workflow per event, email step only (push step when an event has one), security events read-only. Uses Novu's own `discover()`.
- `bridge.test.ts`: 503 without a key, and a health check that finds all five workflows.
- `devices.test.ts`: tokens are added once, capped at 100, and removed individually.

`pnpm --filter @repo/notifications test:integration` sends a real email to Mailpit and reads it back (start it with `pnpm infra:mailpit:up`).

`pnpm --filter @repo/notifications check-types` for types.

## Depends on / used by

Depends on `@novu/api`, `@novu/framework`, `hono`, `nodemailer`, `@repo/emails`, `@repo/config`, `@repo/env` and `@repo/internationalization`. Used by `@repo/auth` and the API app (not built yet).
