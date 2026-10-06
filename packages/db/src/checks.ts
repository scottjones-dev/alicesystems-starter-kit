import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { check } from "drizzle-orm/pg-core";

/** A SQL string literal. Single quotes are doubled, which is how SQL escapes them. */
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/**
 * A CHECK constraint that a text column only holds one of `values`. The TypeScript `enum`
 * option on a column only protects code that goes through Drizzle; this makes Postgres
 * itself refuse anything else (a bad migration, a script, a future service). A NULL passes,
 * so optional columns still work: add `.notNull()` on the column for required ones.
 *
 * The values are written into the SQL as literals, not as parameters: a constraint is part
 * of the table definition, not a query, so there is nothing to bind a parameter to, and
 * drizzle-kit would otherwise write `$1, $2` into the migration. They are developer-written
 * constants, never user input.
 *
 * Name it `<table>_<column>_valid`.
 */
export const oneOf = (
  name: string,
  column: AnyPgColumn,
  values: readonly string[]
) =>
  check(name, sql`${column} in (${sql.raw(values.map(literal).join(", "))})`);
