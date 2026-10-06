import { loadRootEnv } from "@repo/env/load";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import { pgTable, text } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { oneOf } from "./checks";
import { createdAt, id, updatedAt } from "./columns";
import { createTestDatabase } from "./testing";

/*
 * Runs on a real Postgres 18 (`pnpm infra:postgres:up`, then `pnpm setup:local`). Each run
 * uses its own throwaway database, so it never touches your data. Run with
 * `pnpm test:integration`.
 *
 * The package has no tables of its own yet, so this test builds one from the helpers, turns
 * it into SQL the same way `drizzle-kit generate` does, and applies it. That proves the
 * helpers produce SQL that Postgres accepts and enforces.
 */

loadRootEnv();

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) {
  throw new Error("DATABASE_URL is not set. Run `pnpm setup:local` first.");
}

const sample = pgTable(
  "sample",
  {
    createdAt: createdAt(),
    id: id(),
    status: text("status").notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [oneOf("sample_status_valid", table.status, ["open", "closed"])]
);

// Postgres error code for a CHECK constraint violation.
const CHECK_VIOLATION = "23514";
const UUID_VERSION_POSITION = 15;

let pool: Pool;
let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;
let closeClient: (() => Promise<void>) | undefined;

beforeAll(async () => {
  testDatabase = await createTestDatabase(adminUrl, "db_test");
  pool = new Pool({ connectionString: testDatabase.url });

  const empty = generateDrizzleJson({});
  const current = generateDrizzleJson({ sample });
  // One multi-statement query: no parameters, so Postgres runs them in order.
  const statements = await generateMigration(empty, current);
  await pool.query(statements.join("\n"));
});

afterAll(async () => {
  await closeClient?.();
  await pool.end();
  await testDatabase.drop();
});

describe("column helpers on a real database", () => {
  it("generates a time-ordered UUIDv7 id", async () => {
    const { rows } = await pool.query<{ id: string; version: string }>(
      `insert into sample (status) values ('open')
       returning id, substring(id::text from ${UUID_VERSION_POSITION} for 1) as version`
    );
    expect(rows[0]?.version).toBe("7");
  });

  it("stores timestamps with a time zone", async () => {
    const { rows } = await pool.query<{ data_type: string }>(
      `select data_type from information_schema.columns
       where table_name = 'sample' and column_name in ('created_at', 'updated_at')`
    );
    expect(rows.map((row) => row.data_type)).toEqual([
      "timestamp with time zone",
      "timestamp with time zone",
    ]);
  });

  it("fills created_at and updated_at by default", async () => {
    const { rows } = await pool.query<{ created_at: Date; updated_at: Date }>(
      "insert into sample (status) values ('closed') returning created_at, updated_at"
    );
    expect(rows[0]?.created_at).toBeInstanceOf(Date);
    expect(rows[0]?.updated_at).toBeInstanceOf(Date);
  });
});

describe("oneOf on a real database", () => {
  it("accepts a listed value", async () => {
    await expect(
      pool.query("insert into sample (status) values ('open')")
    ).resolves.toBeDefined();
  });

  it("makes Postgres refuse any other value, whoever writes it", async () => {
    await expect(
      pool.query("insert into sample (status) values ('banana')")
    ).rejects.toMatchObject({
      code: CHECK_VIOLATION,
      constraint: "sample_status_valid",
    });
  });
});

describe("client", () => {
  it("answers the readiness ping", async () => {
    const client = await import("./client");
    closeClient = async () => {
      await client.closeDb();
    };
    await expect(client.pingDatabase()).resolves.toBeUndefined();
  });
});
