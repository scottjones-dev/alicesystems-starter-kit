import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildLocalEnv } from "./plan";

/*
 * `pnpm setup:local`: writes a ready-to-use .env at the repository root so anyone can run
 * the project without an Infisical account. It never overwrites an existing .env unless
 * you pass --force.
 */

const OWNER_ONLY_FILE_MODE = 0o600;

// src/local -> src -> packages/env -> packages -> repo root
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const target = path.join(repoRoot, ".env");
const force = process.argv.includes("--force");

if (existsSync(target) && !force) {
  console.error(
    `${target} already exists, so nothing was changed.\nDelete it or run \`pnpm setup:local --force\` to replace it.`
  );
  process.exit(1);
}

const { lines } = buildLocalEnv();
writeFileSync(target, `${lines.join("\n")}\n`, { mode: OWNER_ONLY_FILE_MODE });

console.log(`Wrote ${target}`);
