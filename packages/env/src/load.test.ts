import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findRepoRoot, loadRootEnv } from "./load";

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "load-env-"));
  file = path.join(dir, ".env");
});

afterEach(() => {
  vi.unstubAllEnvs();
  // The loader writes to process.env directly, so clean up what it set.
  Reflect.deleteProperty(process.env, "LOAD_TEST_FROM_FILE");
  Reflect.deleteProperty(process.env, "LOAD_TEST_SHELL");
  rmSync(dir, { force: true, recursive: true });
});

describe("loadRootEnv", () => {
  it("loads the variables in the file", () => {
    writeFileSync(file, "LOAD_TEST_FROM_FILE=hello\n");
    expect(loadRootEnv(file)).toBe(true);
    expect(process.env.LOAD_TEST_FROM_FILE).toBe("hello");
  });

  it("never overrides a variable that is already set", () => {
    vi.stubEnv("LOAD_TEST_SHELL", "from-shell");
    writeFileSync(file, "LOAD_TEST_SHELL=from-file\n");
    loadRootEnv(file);
    expect(process.env.LOAD_TEST_SHELL).toBe("from-shell");
  });

  it("returns false and does nothing when there is no file", () => {
    expect(loadRootEnv(path.join(dir, "missing.env"))).toBe(false);
  });
});

describe("findRepoRoot", () => {
  it("finds the folder with pnpm-workspace.yaml from a folder inside it", () => {
    writeFileSync(path.join(dir, "pnpm-workspace.yaml"), "packages: []\n");
    const nested = path.join(dir, "packages", "db");
    mkdirSync(nested, { recursive: true });
    expect(findRepoRoot(nested)).toBe(dir);
  });

  it("returns undefined outside any workspace", () => {
    expect(findRepoRoot(dir)).toBeUndefined();
  });
});
