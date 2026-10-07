# @repo/jobs

Background jobs: work that must happen later, on a timer, or again after a failure. A typed job definition, `enqueue`, schedules and a worker, on a queue kept in the app's own Postgres ([pg-boss](https://pgboss.io/)).

## Why it exists

Reminder emails, nightly cleanup, monthly invoice runs and retrying a failed webhook should not happen inside a web request. The queue lives in the same database as the data, so a job can be queued **in the same transaction** as the change that needs it, and there is nothing new to host, back up or monitor. The reasoning and the alternatives (BullMQ, Trigger.dev) are in [`docs/content/docs/packages/jobs.mdx`](../../docs/content/docs/packages/jobs.mdx).

Nothing outside `src/runtime.ts` knows pg-boss is there, so the queue can be swapped later without touching a job.

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/jobs/define` | `defineJob({ name, schema, handler, ... })` and the types |
| `@repo/jobs/runtime` | `createJobs({ connectionString, jobs, logger, reportError })` giving `start`, `enqueue`, `stop` |
| `@repo/jobs/keys` | `JOBS_WORKER`: whether this process runs jobs or only queues them |
| `@repo/jobs/schema-sql` | the SQL for pg-boss's tables (used to write the migration) |

## Use it

```ts
// Next to the code the job belongs to.
export const sendReminder = defineJob({
  name: "reminders.send",
  schema: z.object({ reminder_id: z.uuid(), organization_id: z.uuid() }),
  // One organization cannot take every worker.
  group: (payload) => payload.organization_id,
  // Queueing the same reminder twice while it waits is one job.
  dedupeKey: (payload) => payload.reminder_id,
  retry: { limit: 3, delaySeconds: 30 },
  handler: async (payload, { logger, signal }) => {
    // Must be safe to run twice: delivery is at least once.
  },
});

// A timer instead of an enqueue. A scheduled job has an empty payload.
export const nightlyCleanup = defineJob({
  name: "cleanup.nightly",
  schema: z.object({}),
  schedule: { cron: "0 3 * * *", timezone: "Europe/London", missed: "once" },
  handler: async () => { /* ... */ },
});
```

List it once in `apps/api/src/jobs/registry.ts`, then queue it from a route, inside the transaction of the change it belongs to:

```ts
await db.transaction(async (tx) => {
  await saveReminder(tx, reminder);
  await jobs.enqueue(sendReminder, { reminder_id, organization_id }, { transaction: tx });
  // optional: { runAfter: { seconds: 3 * 24 * 3600 } } to delay it
});
```

If the transaction rolls back the job never existed; if it commits the job is certain to be queued.

### What the options do

- **`retry`** defaults to 3 retries, 30 s before the first, doubling each time (up to an hour). Every failed try is logged and sent to Sentry with the job name and try number; a job that gives up stays in the `failed` state in `pgboss.job`.
- **`timeoutSeconds`** (default 15 minutes): a run longer than this counts as failed; the handler's `signal` is aborted.
- **`dedupeKey`** makes queueing safe to repeat. While a job with that key waits, queueing it again adds nothing (`enqueue` returns `id: null`). Once it is running, the same key can be queued again.
- **`group`** is the fair share. At most `groupConcurrency` (default 2) jobs of one group run at once **in a process**, so one tenant's big run cannot use every worker. It is per process, not across processes: with several worker processes the limit multiplies.
- **`schedule`** runs on a cron in a time zone. A scheduled job is never run on top of itself: a tick is skipped while the previous run is waiting or running. `missed: "once"` runs the job once after an outage for the latest missed tick; the default `"skip"` forgets them.
- A queue's policy is fixed when it is created (a keyed job, a scheduled job and a plain job each get a different one). Adding a `dedupeKey` or `schedule` to a job that already ran needs a new job name; `start` says so instead of misbehaving.

## Running it

The API starts the queue and runs the jobs in its own process (`JOBS_WORKER=true`, the default). To run them in a separate worker later, set `JOBS_WORKER=false` on the API and start another process with `JOBS_WORKER=true`: no code changes. On shutdown the API stops taking jobs, lets running ones finish (up to 7 seconds), and only then closes the database.

## The queue's tables come from a migration

pg-boss creates its own tables (the `pgboss` schema). By default it does that itself when it starts, which needs the app to be allowed to create tables. Here the tables are made by a normal migration in `@repo/db` (`0002_pgboss_schema.sql`), and pg-boss is told not to touch the schema (`migrate: false`), like every other table. A role with only select, insert, update, delete, usage and execute on the `pgboss` schema could start the queue and create a queue.

To upgrade pg-boss: read its release notes, then

```bash
pnpm --filter @repo/db exec drizzle-kit generate --custom --name=pgboss_upgrade
pnpm --filter @repo/jobs jobs:schema-sql 45   # 45 = the schema version you are on now
```

and paste the output into the new migration. The integration test fails if the database is not at the schema version the installed pg-boss expects, so a forgotten upgrade is caught.

## Tests

- `pnpm --filter @repo/jobs test` (no database): job names and the empty-payload rule for scheduled jobs, and the schema SQL.
- `pnpm test:integration` (from the root, with Postgres up): on a throwaway database with the real migrations, with the real pg-boss. Runs a job with its checked payload; refuses a wrong payload and a job the app does not run; queue-only mode; retry with failures reported per try; giving up and leaving the job `failed`; a stored payload that no longer matches the schema; dedupe keys; queueing inside a transaction (kept on commit, gone on rollback); delayed jobs; the per-organization limit; schedules added, kept and removed; a scheduled job not overlapping itself; a queue's policy not changing; stop waiting for a running job; and the schema version.

Not tested: several worker processes at once, and a worker killed in the middle of a job (pg-boss's own job).

## Depends on / used by

Depends on `pg-boss`, `drizzle-orm`, `zod`, `@repo/env` and `@repo/observability` (types). Used by `apps/api`.
