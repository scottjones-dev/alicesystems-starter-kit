import { createTestDatabase } from "@repo/db/testing";
import { loadRootEnv } from "@repo/env/load";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { baseActions, defineAuditActions } from "./actions";
import { readAudit } from "./read";
import type { AuditExecutor } from "./record";
import { createAuditor } from "./record";

/*
 * Runs on a real Postgres 18 (`pnpm infra:postgres:up`, then `pnpm setup:local`) with the real
 * migrations applied to a throwaway database, so it proves what only Postgres can: the table's
 * constraints, and that the log really is append-only. Run with `pnpm test:integration`.
 */

loadRootEnv();

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) {
  throw new Error("DATABASE_URL is not set. Run `pnpm setup:local` first.");
}

const RESTRICT_VIOLATION = "23001";
const CHECK_VIOLATION = "23514";
const UUID_VERSION_POSITION = 15;
const APPEND_ONLY = /append-only/u;
const NEEDS_A_FILTER = /Filter the audit log/u;

const ORG_A = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f01";
const ORG_B = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f02";
const USER_1 = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f11";
const USER_2 = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f12";
const SALE_1 = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f21";
const SALE_2 = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f22";

const actions = defineAuditActions({
  ...baseActions,
  "till.void": z.strictObject({
    reason: z.enum(["customer", "error"]),
    sale_id: z.uuid(),
  }),
});
const { record } = createAuditor({ actions });

let pool: Pool;
let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;
let db: ReturnType<typeof drizzle>;

/** A raw INSERT, to prove the table's own constraints without going through `record`. */
const rawInsert = (columns: Record<string, string | null>) => {
  const names = Object.keys(columns);
  return pool.query(
    `insert into audit_log (${names.join(", ")}) values (${names
      .map((_, index) => `$${index + 1}`)
      .join(", ")})`,
    Object.values(columns)
  );
};

const voidSale = (
  saleId: string,
  organizationId: string,
  actorId: string,
  executor: AuditExecutor = db
) =>
  record(executor, {
    action: "till.void",
    actor: { id: actorId, type: "user" },
    details: { reason: "error", sale_id: saleId },
    organizationId,
    target: { id: saleId, type: "sale" },
  });

beforeAll(async () => {
  testDatabase = await createTestDatabase(adminUrl, "audit_test");
  pool = new Pool({ connectionString: testDatabase.url });
  db = drizzle({ client: pool });
});

afterAll(async () => {
  await pool.end();
  await testDatabase.drop();
});

describe("record on a real database", () => {
  it("writes a time-ordered UUIDv7 id and the time", async () => {
    const { id } = await voidSale(SALE_1, ORG_A, USER_1);

    const { rows } = await pool.query<{ occurred_at: Date; version: string }>(
      `select occurred_at, substring(id::text from ${UUID_VERSION_POSITION} for 1) as version
       from audit_log where id = $1`,
      [id]
    );
    expect(rows[0]?.version).toBe("7");
    expect(rows[0]?.occurred_at).toBeInstanceOf(Date);
  });

  it("stores the system as an actor with no id, and an admin acting as a user", async () => {
    await record(db, {
      action: "admin.impersonation_ended",
      actor: { type: "system" },
      details: {},
    });
    await record(db, {
      action: "admin.impersonation_started",
      actor: { actingAsId: USER_2, id: USER_1, type: "admin" },
      details: { reason: "support_request" },
      target: { id: USER_2, type: "user" },
    });

    const { rows } = await pool.query(
      `select actor_type, actor_id, acting_as_id from audit_log
       where action like 'admin.%' order by id`
    );
    expect(rows).toStrictEqual([
      { acting_as_id: null, actor_id: null, actor_type: "system" },
      { acting_as_id: USER_2, actor_id: USER_1, actor_type: "admin" },
    ]);
  });

  it("commits with the change it describes, and disappears with it when that rolls back", async () => {
    const before = await pool.query("select count(*)::int as n from audit_log");

    await expect(
      db.transaction(async (tx) => {
        await voidSale(SALE_2, ORG_A, USER_1, tx);
        throw new Error("the change failed");
      })
    ).rejects.toThrow("the change failed");

    const after = await pool.query("select count(*)::int as n from audit_log");
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });
});

describe("the log is append-only", () => {
  it("refuses to change a row", async () => {
    await expect(
      pool.query("update audit_log set action = 'till.edited'")
    ).rejects.toMatchObject({
      code: RESTRICT_VIOLATION,
      message: expect.stringMatching(APPEND_ONLY),
    });
  });

  it("refuses to delete a row", async () => {
    await expect(pool.query("delete from audit_log")).rejects.toMatchObject({
      code: RESTRICT_VIOLATION,
    });
  });

  it("refuses to empty the table", async () => {
    await expect(pool.query("truncate audit_log")).rejects.toMatchObject({
      code: RESTRICT_VIOLATION,
    });
  });

  it("refuses the same changes made through Drizzle", async () => {
    const { auditLog } = await import("@repo/db/schemas/audit-log");

    await expect(db.delete(auditLog)).rejects.toThrow();
    await expect(
      db.update(auditLog).set({ organizationId: ORG_B })
    ).rejects.toThrow();
  });

  it("leaves every row in place after the attempts", async () => {
    const { rows } = await pool.query(
      "select count(*)::int as n from audit_log"
    );

    expect(rows[0]?.n).toBeGreaterThanOrEqual(3);
  });
});

describe("the table's own constraints", () => {
  const valid = { action: "till.void", actor_id: USER_1, actor_type: "user" };

  it("accepts a valid row", async () => {
    await expect(rawInsert(valid)).resolves.toBeDefined();
  });

  it.each([
    [
      "an action with no area",
      { ...valid, action: "void" },
      "audit_log_action_valid",
    ],
    [
      "an action in capitals",
      { ...valid, action: "Till.Void" },
      "audit_log_action_valid",
    ],
    [
      "an unknown actor type",
      { ...valid, actor_type: "robot" },
      "audit_log_actor_type_valid",
    ],
    [
      "a system actor with an id",
      { ...valid, actor_type: "system" },
      "audit_log_actor_id_valid",
    ],
    [
      "a user with no id",
      { action: "till.void", actor_type: "user" },
      "audit_log_actor_id_valid",
    ],
    [
      "acting as someone, when not an admin",
      { ...valid, acting_as_id: USER_2 },
      "audit_log_acting_as_valid",
    ],
    [
      "a target type with no target id",
      { ...valid, target_type: "sale" },
      "audit_log_target_valid",
    ],
    [
      "a target id with no target type",
      { ...valid, target_id: SALE_1 },
      "audit_log_target_valid",
    ],
  ])("refuses %s", async (_name, columns, constraint) => {
    await expect(rawInsert(columns)).rejects.toMatchObject({
      code: CHECK_VIOLATION,
      constraint,
    });
  });
});

describe("readAudit", () => {
  // Entries for a separate organization, so the other tests' rows do not get in the way.
  const ORG_READ = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f90";
  const sales = Array.from(
    { length: 5 },
    (_, index) => `0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f${50 + index}`
  );

  beforeAll(async () => {
    for (const sale of sales) {
      // One at a time on purpose: the ids, and so the order read back, follow the loop.
      // biome-ignore lint/performance/noAwaitInLoops: sequential by design
      await voidSale(sale, ORG_READ, USER_2);
    }
  });

  it("refuses to read without a filter", async () => {
    await expect(readAudit(db, {})).rejects.toThrow(NEEDS_A_FILTER);
  });

  it("returns an organization's entries newest first", async () => {
    const { entries, next } = await readAudit(db, { organizationId: ORG_READ });

    expect(entries.map((entry) => entry.targetId)).toStrictEqual(
      [...sales].reverse()
    );
    expect(next).toBeNull();
  });

  it("pages through the entries without repeating or skipping one", async () => {
    const seen: string[] = [];
    let before: string | undefined;
    let pages = 0;

    do {
      // Each page needs the previous page's cursor, so they cannot run in parallel.
      // biome-ignore lint/performance/noAwaitInLoops: sequential by design
      const page = await readAudit(db, {
        before,
        limit: 2,
        organizationId: ORG_READ,
      });
      seen.push(...page.entries.map((entry) => entry.targetId ?? ""));
      before = page.next ?? undefined;
      pages += 1;
    } while (before);

    expect(pages).toBe(3);
    expect(seen).toStrictEqual([...sales].reverse());
  });

  it("does not shift a page when a newer entry arrives while paging", async () => {
    const first = await readAudit(db, { limit: 2, organizationId: ORG_READ });
    await voidSale(SALE_1, ORG_READ, USER_2);
    const second = await readAudit(db, {
      before: first.next ?? undefined,
      limit: 2,
      organizationId: ORG_READ,
    });

    expect(second.entries.map((entry) => entry.targetId)).toStrictEqual([
      sales[2],
      sales[1],
    ]);
  });

  it("filters by target and by actor", async () => {
    const byTarget = await readAudit(db, {
      target: { id: sales[0] ?? "", type: "sale" },
    });
    const byActor = await readAudit(db, { actorId: USER_2 });

    expect(byTarget.entries.map((entry) => entry.targetId)).toStrictEqual([
      sales[0],
    ]);
    expect(byActor.entries.every((entry) => entry.actorId === USER_2)).toBe(
      true
    );
  });

  it("keeps one organization's entries out of another's", async () => {
    const { entries } = await readAudit(db, { organizationId: ORG_B });

    expect(entries).toHaveLength(0);
  });

  it("clamps the page size", async () => {
    const { entries } = await readAudit(db, {
      limit: 0,
      organizationId: ORG_READ,
    });

    expect(entries).toHaveLength(1);
  });
});

describe("indexes", () => {
  it("has one for each way the log is read", async () => {
    const { rows } = await pool.query<{ indexname: string }>(
      "select indexname from pg_indexes where tablename = 'audit_log' order by indexname"
    );

    expect(rows.map((row) => row.indexname)).toStrictEqual([
      "audit_log_actor_idx",
      "audit_log_organization_idx",
      "audit_log_pkey",
      "audit_log_target_idx",
    ]);
  });
});
