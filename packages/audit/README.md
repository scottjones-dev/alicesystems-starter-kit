# @repo/audit

An append-only log of who did what, to what, and when. Postgres itself refuses to change or delete an entry.

## Why it exists

Some actions must be explainable later: a till void, a refund, a changed fee, a staff member opening a child's record, an admin acting as a user. This package writes those entries in the same transaction as the change, keeps personal data out of them, and reads them back. The reasoning is in [`docs/content/docs/packages/audit.mdx`](../../docs/content/docs/packages/audit.mdx).

The **table** (`audit_log`) lives in [`@repo/db`](../db/README.md) (`src/schemas/audit-log.ts`, with the append-only trigger in `migrations/0001_audit_log_append_only.sql`), because every table lives there and shares one migration history. This package is the behaviour.

## What's inside

| Import | What it gives you |
| --- | --- |
| `@repo/audit/actions` | `defineAuditActions`, and `baseActions` (an admin starting and ending impersonation) |
| `@repo/audit/record` | `createAuditor({ actions })` giving `record(executor, entry)`; `AuditExecutor`, `AuditEntry` |
| `@repo/audit/read` | `readAudit(db, filter)`: newest first, one organization, record or person, paged by id |
| `@repo/audit/actors` | `Actor` (`user`, `system`, `admin` acting as a user) |
| `@repo/audit/details` | `assertIdsOnly`, `auditCode()`: the ids-only rule |

## Use it

```ts
// Once per platform: its own actions beside the generic ones.
const actions = defineAuditActions({
  ...baseActions,
  "till.void": z.strictObject({ sale_id: z.uuid(), reason: z.enum(["error", "customer"]) }),
});
export const { record } = createAuditor({ actions });

// In a handler: the audit entry is the last write of the transaction it describes.
await db.transaction(async (tx) => {
  await voidSale(tx, saleId);
  await record(tx, {
    action: "till.void",
    actor: { id: user.id, type: "user" },
    details: { sale_id: saleId, reason: "error" },
    organizationId,
    requestId,
    target: { id: saleId, type: "sale" },
  });
});

// Reading (the API checks the caller's role in that organization first).
const { entries, next } = await readAudit(db, { organizationId, limit: 50 });
const older = await readAudit(db, { organizationId, before: next ?? undefined });
```

A typo in the action name, a missing detail or an extra one fails to compile, and fails at run time too.

### Ids only in the details

Details hold ids, codes, counts and flags: never names, notes or free text. Three layers: the action's schema is a `strictObject` (unknown fields refused); values must be flat; and a run-time guard refuses any string with a space, an `@` or more than 64 characters (prose and email addresses have them, ids do not). It cannot catch a one-word name, so do not give an action a `name` field.

## Database setting you must make

The trigger stops bugs, scripts and a careless admin. It does **not** stop a database superuser, who can switch a trigger off. So in production the API should connect as a role that can only add and read this table:

```sql
-- once per environment, by whoever administers the database
create role api_app login password '...';
grant select, insert on audit_log to api_app;
-- plus the grants the app needs on its other tables
```

## Tests

- `pnpm --filter @repo/audit test`: no database. The writer (the row it builds for a user, the system and an admin acting as someone; refusing a wrong action, a missing or extra detail, a bad id, free text; writing nothing when it refuses), the actor rules, the ids-only guard, and compile-time checks that wrong entries do not type-check.
- `pnpm test:integration` (from the root, with Postgres up): on a throwaway database with the real migrations. Proves what only Postgres can: UPDATE, DELETE and TRUNCATE are refused (also through Drizzle); the table's CHECK constraints (action format, actor and target shape); an entry rolls back with the transaction it belongs to; reading by organization, target and actor, paging without repeats or skips, and a page not shifting when a newer entry arrives; the indexes exist.

## Depends on / used by

Depends on `@repo/db` and `zod`. Used by the API when a route changes something worth explaining (none yet), and by auth and payments when they arrive.

Not done yet: retention (deleting old entries). The trigger blocks it on purpose; the plan is monthly partitions dropped by a maintenance job, added with `@repo/jobs`.
