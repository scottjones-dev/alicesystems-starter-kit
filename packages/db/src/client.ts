import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { keys } from "./keys";

/*
 * Connection pool limits. An API process talks to one Postgres, so a small pool is enough and
 * keeps us well under the connection limit of the database. The timeouts make a stuck database
 * fail a request quickly instead of hanging it (and everything queued behind it).
 */
const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECTION_TIMEOUT_MS = 5000;
const STATEMENT_TIMEOUT_MS = 15_000;
// A readiness probe must answer quickly, so it gives up much sooner than a normal query.
const PING_TIMEOUT_MS = 2000;

const pool = new Pool({
  connectionString: keys.env().DATABASE_URL,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  max: MAX_CONNECTIONS,
  statement_timeout: STATEMENT_TIMEOUT_MS,
});

// An idle connection can be dropped by the server (restart, failover). Without a listener,
// pg re-throws that as an unhandled 'error' event and the whole process crashes. With one,
// the pool discards the dead connection and opens a new one on the next query.
pool.on("error", (error) => {
  console.error("Idle database connection failed:", error.message);
});

export const db = drizzle({ client: pool });
export type Database = typeof db;

/** Closes every connection. Call it when the process is shutting down, and in tests. */
export const closeDb = () => pool.end();

/**
 * Checks the database can be reached and answers. Used by a readiness endpoint so a load
 * balancer stops sending traffic to an instance that has lost its database. Rejects if the
 * database does not answer within a couple of seconds.
 */
export const pingDatabase = async (): Promise<void> => {
  // pg supports a per-query `query_timeout`, but @types/pg does not list it yet. Passing it
  // through a variable (not an object literal) is allowed by TypeScript.
  const probe = { query_timeout: PING_TIMEOUT_MS, text: "select 1" };
  await pool.query(probe);
};
