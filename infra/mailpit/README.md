# infra/mailpit

A local inbox for development email.

## Why it exists

Sign-up, password reset and invitation emails need somewhere to land while you build. [Mailpit](https://mailpit.axllent.org) runs in Docker, accepts mail on SMTP and shows it in a web inbox. Nothing leaves your machine. The reasoning is in [`docs/content/docs/infra/mailpit.mdx`](../../docs/content/docs/infra/mailpit.mdx).

## Use it

```bash
pnpm infra:mailpit:up     # start and wait until healthy (pnpm infra:up starts Postgres too)
pnpm infra:mailpit:down
```

| What | Where |
| --- | --- |
| SMTP (the app sends here) | `localhost:1025` |
| Web inbox and API | <http://localhost:8025> |

`pnpm setup:local` points `SMTP_HOST` and `SMTP_PORT` at it.

## Tests

None for the container itself. `pnpm --filter @repo/notifications test:integration` sends a real email through it. Check it is up with `docker compose -f infra/mailpit/docker-compose.yml ps`.

## Depends on / used by

Needs Docker. Used by `@repo/notifications` (the smtp transport).
