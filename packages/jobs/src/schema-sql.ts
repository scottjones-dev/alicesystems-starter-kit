import { getConstructionPlans, getMigrationPlans } from "pg-boss";

/*
 * pg-boss keeps its queue in tables of its own (the `pgboss` schema). By default it installs and
 * upgrades them itself when it starts, which needs the app's database role to be allowed to
 * create tables. We do not do that: the tables are created by a normal migration in @repo/db,
 * like every other table, and pg-boss is told not to touch the schema (`migrate: false`). This
 * file produces the SQL for that migration.
 */

export const PGBOSS_SCHEMA = "pgboss";

/** pg-boss wraps its SQL in BEGIN and COMMIT; our migration runner already runs in a transaction. */
const TRANSACTION_LINES = /^\s*(?:BEGIN|COMMIT);\s*$/gmu;

const withoutTransaction = (sql: string) => sql.replace(TRANSACTION_LINES, "");

/** The SQL that creates pg-boss's tables, as a migration body. */
export const constructionSql = (): string =>
  withoutTransaction(getConstructionPlans(PGBOSS_SCHEMA)).trim();

/** The SQL that upgrades an installed pg-boss from schema version `from` to the current one. */
export const upgradeSql = (from: number): string =>
  withoutTransaction(getMigrationPlans(PGBOSS_SCHEMA, from)).trim();
