import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const MIGRATIONS_FOLDER = path.join(import.meta.dirname, "..", "migrations");
// drizzle-kit writes this file with the first migration. Before any table exists there is
// nothing to apply.
const MIGRATION_JOURNAL = path.join(MIGRATIONS_FOLDER, "meta", "_journal.json");

// The prefix goes into a `create database` statement, which cannot be parameterised.
const SAFE_PREFIX = /^[a-z][a-z0-9_]*$/u;

// Test pools can have connections cut by a forced drop; ignore that instead of crashing.
const ignorePoolError = (): void => {
  // Deliberately empty: the error is expected, and logging it would be noise.
};

/**
 * For integration tests only (never imported by the apps). Creates a brand new database on
 * the Postgres at `adminUrl`, applies the real migrations to it, and hands back its URL and a
 * `drop()` to remove it afterwards, so a test run never touches real data and runs cannot
 * interfere with each other.
 */
export const createTestDatabase = async (adminUrl: string, prefix: string) => {
  if (!SAFE_PREFIX.test(prefix)) {
    throw new Error(
      `Test database prefix "${prefix}" must be lowercase letters, digits and underscores.`
    );
  }
  const name = `${prefix}_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;

  const admin = new Pool({ connectionString: adminUrl });
  admin.on("error", ignorePoolError);
  await admin.query(`create database ${name}`);

  const pool = new Pool({ connectionString: url.toString() });
  pool.on("error", ignorePoolError);
  try {
    if (existsSync(MIGRATION_JOURNAL)) {
      await migrate(drizzle({ client: pool }), {
        migrationsFolder: MIGRATIONS_FOLDER,
      });
    }
  } finally {
    await pool.end();
  }

  return {
    /** Removes the database, closing any connections still open to it. */
    drop: async () => {
      await admin.query(`drop database if exists ${name} with (force)`);
      await admin.end();
    },
    url: url.toString(),
  };
};
