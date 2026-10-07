import { constructionSql, upgradeSql } from "../schema-sql";

/*
 * Prints the SQL for a @repo/db migration that installs or upgrades pg-boss's tables.
 *
 *   pnpm --filter @repo/jobs jobs:schema-sql            the full install (the first time)
 *   pnpm --filter @repo/jobs jobs:schema-sql 45         the upgrade from schema version 45
 *
 * Make an empty migration with `pnpm --filter @repo/db exec drizzle-kit generate --custom
 * --name=pgboss_upgrade`, then paste the output into it. See the README.
 */
const [from] = process.argv.slice(2);

if (from === undefined) {
  console.log(constructionSql());
} else {
  const version = Number(from);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`"${from}" is not a schema version number.`);
  }
  console.log(upgradeSql(version));
}
