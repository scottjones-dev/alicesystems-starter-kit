# infra/postgres

Local PostgreSQL 18 for development.

## Why it exists

The API and `packages/db` need a real database. Docker Compose gives everyone the same one with no install.

## Use it

```bash
pnpm infra:postgres:up     # start and wait until it is healthy (or pnpm infra:up)
pnpm infra:postgres:down   # stop (data is kept in the postgres-data volume)
```

Connects on `localhost:5432`, database `starterkit`, user and password `postgres`. These are throwaway local credentials, never used outside your machine. `pnpm setup:local` writes the matching `DATABASE_URL` to the root `.env`.

## Tests

None. The database integration tests in `packages/db` (`pnpm test:integration`) run against it. Check it is up with `docker compose -f infra/postgres/docker-compose.yml ps`.

## Depends on / used by

Needs Docker. Used by `packages/db` and, later, the API app.
