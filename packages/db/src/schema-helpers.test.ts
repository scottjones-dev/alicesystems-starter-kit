import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import type { PgTable } from "drizzle-orm/pg-core";
import { getTableConfig, pgTable, text } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { oneOf } from "./checks";
import { createdAt, id, updatedAt } from "./columns";
import { createTestDatabase } from "./testing";

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

const columnNamed = (name: string) => {
  const column = getTableConfig(sample).columns.find(
    (entry) => entry.name === name
  );
  if (!column) {
    throw new Error(`No column ${name}`);
  }
  return column;
};

describe("column helpers", () => {
  it("id is a primary key with a database-generated default", () => {
    const column = columnNamed("id");
    expect(column.primary).toBe(true);
    expect(column.hasDefault).toBe(true);
    expect(column.getSQLType()).toBe("uuid");
  });

  it("createdAt and updatedAt are required timestamps with a time zone", () => {
    for (const name of ["created_at", "updated_at"]) {
      const column = columnNamed(name);
      expect(column.notNull).toBe(true);
      expect(column.hasDefault).toBe(true);
      expect(column.getSQLType()).toBe("timestamp with time zone");
    }
  });

  it("updatedAt is refreshed on update, createdAt is not", () => {
    expect(columnNamed("updated_at").onUpdateFn).toBeTypeOf("function");
    expect(columnNamed("created_at").onUpdateFn).toBeUndefined();
  });
});

const migrationSql = async (table: PgTable) =>
  (
    await generateMigration(
      generateDrizzleJson({}),
      generateDrizzleJson({ table })
    )
  ).join("\n");

describe("oneOf", () => {
  it("writes the allowed values into the migration as literals, not $1 placeholders", async () => {
    const ddl = await migrationSql(sample);
    expect(ddl).toContain("in ('open', 'closed')");
    expect(ddl).not.toContain("$1");
  });

  it("escapes a single quote inside a value", async () => {
    const quoted = pgTable("quoted", { status: text("status") }, (columns) => [
      oneOf("quoted_status_valid", columns.status, ["it's"]),
    ]);
    expect(await migrationSql(quoted)).toContain("in ('it''s')");
  });

  it("adds a CHECK constraint with the name it was given", () => {
    const { checks } = getTableConfig(sample);
    expect(checks.map((item) => item.name)).toEqual(["sample_status_valid"]);
  });
});

describe("createTestDatabase", () => {
  it("refuses a prefix that is not a plain identifier, before touching a database", async () => {
    const prefixes = ["Bad", "a b", "a;drop", "1abc", ""];
    await Promise.all(
      prefixes.map((prefix) =>
        expect(
          createTestDatabase("postgres://localhost:1/none", prefix)
        ).rejects.toThrow("must be lowercase letters")
      )
    );
  });
});
