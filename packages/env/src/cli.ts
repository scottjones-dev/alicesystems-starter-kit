import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { registry } from "../../../env.registry";
import type { Environment, Folder } from "./define";
import { ENVIRONMENTS, FOLDERS } from "./define";
import type { SeedPlan } from "./plan";
import { buildExample, buildLocalEnv, buildSeedPlan } from "./plan";

/*
 * The three commands, thin glue over the pure functions in plan.ts:
 *   pnpm secrets:seed <dev|test|staging|prod> [--dry-run] [--yes]
 *   pnpm setup:local [--force]
 *   pnpm env:pull <dev|test|staging|prod> [--force]
 *   pnpm env:example [--check]
 */

const OWNER_ONLY_FILE_MODE = 0o600;
// src -> packages/env -> packages -> repo root
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

// --- Infisical ---------------------------------------------------------------------------

// execFileSync (no shell) so "/api" is not rewritten into a Windows path by Git Bash.
const infisical = (args: string[]): string =>
  execFileSync("infisical", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

/** Creating a folder that already exists errors; that is fine, the goal is "it exists". */
const ensureFolder = (environment: Environment, folder: Folder): void => {
  try {
    infisical([
      "secrets",
      "folders",
      "create",
      "--name",
      folder.slice(1),
      "--path",
      "/",
      "--env",
      environment,
    ]);
  } catch {
    // already exists
  }
};

/** Key names only: we never print or keep existing values. */
const existingKeys = (
  environment: Environment,
  folder: Folder
): Set<string> => {
  const json = infisical([
    "export",
    "--env",
    environment,
    "--path",
    folder,
    "--format",
    "json",
  ]);
  // SAFETY: `infisical export --format json` prints an array of {key, value} objects.
  const secrets = JSON.parse(json || "[]") as { key: string }[];
  return new Set(secrets.map((secret) => secret.key));
};

/** Values go through a temp file (not argv) so they never show in the process list. */
const setSecrets = (
  environment: Environment,
  folder: Folder,
  values: Record<string, string>
): void => {
  const dir = mkdtempSync(path.join(tmpdir(), "seed-"));
  const file = path.join(dir, "secrets.env");
  try {
    const lines = Object.entries(values).map(
      ([key, value]) => `${key}="${value}"`
    );
    writeFileSync(file, lines.join("\n"), { mode: OWNER_ONLY_FILE_MODE });
    infisical([
      "secrets",
      "set",
      "--file",
      file,
      "--env",
      environment,
      "--path",
      folder,
    ]);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
};

// --- Commands ----------------------------------------------------------------------------

const parseEnvironment = (value: string | undefined): Environment => {
  const match = ENVIRONMENTS.find((candidate) => candidate === value);
  if (!match) {
    throw new Error(
      `Usage: pnpm secrets:seed <${ENVIRONMENTS.join("|")}> [--dry-run] [--yes]`
    );
  }
  return match;
};

/** Seeds one folder and returns the manual keys still missing there. */
const seedFolder = (
  environment: Environment,
  folder: Folder,
  plan: SeedPlan,
  dryRun: boolean
): SeedPlan["manual"] => {
  if (!dryRun) {
    ensureFolder(environment, folder);
  }
  // Never overwrite: a key that already exists is left exactly as it is.
  const present = dryRun
    ? new Set<string>()
    : existingKeys(environment, folder);

  const toSet: Record<string, string> = {};
  for (const secret of plan.auto) {
    if (secret.folder === folder && !present.has(secret.key)) {
      toSet[secret.key] = secret.value;
    }
  }

  const keys = Object.keys(toSet);
  const summary =
    keys.length > 0 ? `adding ${keys.join(", ")}` : "nothing to add";
  console.log(`${folder}: ${summary}`);
  if (keys.length > 0 && !dryRun) {
    setSecrets(environment, folder, toSet);
  }

  return plan.manual.filter(
    (secret) => secret.folder === folder && !present.has(secret.key)
  );
};

const seed = (args: string[]): void => {
  const [environmentArg, ...flags] = args;
  const environment = parseEnvironment(environmentArg);
  const dryRun = flags.includes("--dry-run");

  if (environment === "prod" && !dryRun && !flags.includes("--yes")) {
    throw new Error(
      "Seeding prod changes the production secrets store. Run with --dry-run first, then add --yes."
    );
  }

  const plan = buildSeedPlan(registry, environment);
  console.log(`Seeding Infisical ${environment}${dryRun ? " (dry run)" : ""}`);

  const missingManual = FOLDERS.flatMap((folder) =>
    seedFolder(environment, folder, plan, dryRun)
  );

  if (missingManual.length > 0) {
    console.log("\nStill needs a real value (set in the Infisical dashboard):");
    for (const { folder, key, hint } of missingManual) {
      console.log(`  ${folder} ${key}  <- ${hint}`);
    }
  }
};

const local = (args: string[]): void => {
  const target = path.join(repoRoot, ".env");
  if (existsSync(target) && !args.includes("--force")) {
    throw new Error(
      `${target} already exists, so nothing was changed.\nDelete it or run \`pnpm setup:local --force\` to replace it.`
    );
  }
  const { lines } = buildLocalEnv(registry);
  writeFileSync(target, `${lines.join("\n")}\n`, {
    mode: OWNER_ONLY_FILE_MODE,
  });
  console.log(`Wrote ${target}`);
};

/** Writes the root .env from Infisical, so every command reads one file whatever its source. */
const pull = (args: string[]): void => {
  const [environmentArg, ...flags] = args;
  const environment = parseEnvironment(environmentArg);
  const target = path.join(repoRoot, ".env");
  if (existsSync(target) && !flags.includes("--force")) {
    throw new Error(
      `${target} already exists, so nothing was changed.\nDelete it or run with --force to replace it.`
    );
  }
  // One export per folder, joined into a single file. Run `pnpm secrets:seed` first so the folders exist.
  const sections = FOLDERS.map((folder) =>
    infisical([
      "export",
      "--env",
      environment,
      "--path",
      folder,
      "--format",
      "dotenv",
    ]).trim()
  ).filter(Boolean);
  writeFileSync(target, `${sections.join("\n")}\n`, {
    mode: OWNER_ONLY_FILE_MODE,
  });
  console.log(`Wrote ${target} from Infisical ${environment}`);
};

const example = (args: string[]): void => {
  const target = path.join(repoRoot, ".env.example");
  const expected = buildExample(registry);
  if (args.includes("--check")) {
    const actual = existsSync(target) ? readFileSync(target, "utf-8") : "";
    if (actual !== expected) {
      throw new Error(".env.example is out of date. Run `pnpm env:example`.");
    }
    console.log(".env.example is up to date.");
    return;
  }
  writeFileSync(target, expected);
  console.log(`Wrote ${target}`);
};

const COMMANDS: Record<string, (args: string[]) => void> = {
  example,
  local,
  pull,
  seed,
};

const [command = "", ...rest] = process.argv.slice(2);
const run = COMMANDS[command];
if (!run) {
  throw new Error(
    `Unknown command "${command}". Use: seed, local, pull or example.`
  );
}
run(rest);
