import { existsSync } from "node:fs";
import path from "node:path";

const WORKSPACE_FILE = "pnpm-workspace.yaml";

/**
 * Walks up from `from` to the folder that holds pnpm-workspace.yaml, the repo root.
 * It starts from the working directory instead of this file's location because drizzle-kit
 * loads its config as CommonJS, where `import.meta` does not exist.
 */
export const findRepoRoot = (from = process.cwd()): string | undefined => {
  let dir = path.resolve(from);
  while (!existsSync(path.join(dir, WORKSPACE_FILE))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      return;
    }
    dir = parent;
  }
  return dir;
};

/**
 * Loads the root `.env` into `process.env`, for tools that run outside an app (database
 * commands, integration tests). Variables that are already set win over the file, so CI and
 * production, which pass real values, are never overridden. Returns false when there is no
 * file, which is normal in CI.
 */
export const loadRootEnv = (file?: string): boolean => {
  const root = findRepoRoot();
  const target = file ?? (root && path.join(root, ".env"));
  if (!(target && existsSync(target))) {
    return false;
  }
  process.loadEnvFile(target);
  return true;
};
