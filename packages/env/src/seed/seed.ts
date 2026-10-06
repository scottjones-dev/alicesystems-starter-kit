import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Environment, Folder, ManualSecret, SeedPlan } from "./plan";
import { buildSeedPlan, ENVIRONMENTS } from "./plan";

const FOLDERS: Folder[] = ["/api", "/web", "/native"];
const OWNER_ONLY_FILE_MODE = 0o600;

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

const parseEnvironment = (value: string | undefined): Environment => {
  const match = ENVIRONMENTS.find((candidate) => candidate === value);
  if (!match) {
    throw new Error(
      `Usage: pnpm secrets:seed <${ENVIRONMENTS.join("|")}> [--dry-run]`
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
): ManualSecret[] => {
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

const main = (): void => {
  const [environmentArg, ...flags] = process.argv.slice(2);
  const environment = parseEnvironment(environmentArg);
  const dryRun = flags.includes("--dry-run");
  const plan = buildSeedPlan(environment);

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

main();
