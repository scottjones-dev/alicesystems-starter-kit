import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { registry } from "../../../env.registry";
import { defineKeys, ENVIRONMENTS } from "./define";
import {
  buildExample,
  buildLocalEnv,
  buildSeedPlan,
  flattenKeys,
} from "./plan";

const DUPLICATE = /defined more than once/u;

// A small registry that covers every kind of key: generated, manual, optional, local-only.
const sample = [
  defineKeys({
    DATABASE_URL: {
      description: "Postgres connection string",
      folder: "/api",
      hint: "Neon dashboard",
      local: "postgres://localhost/db",
      schema: z.url(),
    },
    NOVU_KEY: {
      description: "Needed wherever Novu is used",
      folder: "/api",
      requiredIn: ["staging", "prod"],
      schema: z.string().optional(),
    },
    SECRET: {
      auto: () => "generated",
      description: "A signing secret",
      folder: "/api",
      schema: z.string(),
    },
    SENTRY_DSN: {
      description: "Error reporting",
      folder: "/api",
      schema: z.url().optional(),
    },
    SITE_URL: {
      auto: (environment) =>
        environment === "dev" ? "http://localhost:3000" : undefined,
      description: "Public site URL",
      folder: "/web",
      schema: z.url(),
    },
  }),
];

describe("flattenKeys", () => {
  it("lists every key with its name", () => {
    expect(
      flattenKeys(sample)
        .map(({ key }) => key)
        .sort()
    ).toEqual(["DATABASE_URL", "NOVU_KEY", "SECRET", "SENTRY_DSN", "SITE_URL"]);
  });

  it("refuses a key defined twice", () => {
    expect(() => flattenKeys([...sample, ...sample])).toThrow(DUPLICATE);
  });
});

describe("buildSeedPlan", () => {
  it("fills what it can and asks a human for the rest", () => {
    const plan = buildSeedPlan(sample, "dev");
    expect(plan.auto).toEqual([
      { folder: "/api", key: "SECRET", value: "generated" },
      { folder: "/web", key: "SITE_URL", value: "http://localhost:3000" },
    ]);
    expect(plan.manual).toEqual([
      { folder: "/api", hint: "Neon dashboard", key: "DATABASE_URL" },
    ]);
  });

  it("asks a human for URLs outside dev", () => {
    const keys = buildSeedPlan(sample, "prod").manual.map(({ key }) => key);
    expect(keys).toEqual(["DATABASE_URL", "NOVU_KEY", "SITE_URL"]);
  });

  it("asks a human for a key the app needs in some environments, only there", () => {
    const manualKeys = (environment: (typeof ENVIRONMENTS)[number]) =>
      buildSeedPlan(sample, environment).manual.map(({ key }) => key);
    expect(manualKeys("dev")).not.toContain("NOVU_KEY");
    expect(manualKeys("test")).not.toContain("NOVU_KEY");
    expect(manualKeys("staging")).toContain("NOVU_KEY");
    expect(manualKeys("prod")).toContain("NOVU_KEY");
  });

  it("never mentions optional keys that have no value", () => {
    for (const environment of ENVIRONMENTS) {
      const { auto, manual } = buildSeedPlan(sample, environment);
      const named = [...auto, ...manual].map(({ key }) => key);
      expect(named).not.toContain("SENTRY_DSN");
    }
  });

  it("runs dev in development mode and everything else in production", () => {
    const nodeEnv = (environment: (typeof ENVIRONMENTS)[number]) =>
      buildSeedPlan(registry, environment).auto.find(
        ({ key }) => key === "NODE_ENV"
      )?.value;
    expect(nodeEnv("dev")).toBe("development");
    for (const environment of ["test", "staging", "prod"] as const) {
      expect(nodeEnv(environment)).toBe("production");
    }
  });
});

describe("buildLocalEnv", () => {
  const { lines, values } = buildLocalEnv(sample);

  it("uses the local value, or else the dev auto value", () => {
    expect(values).toEqual({
      DATABASE_URL: "postgres://localhost/db",
      SECRET: "generated",
      SITE_URL: "http://localhost:3000",
    });
  });

  it("writes a KEY=value line for every value", () => {
    for (const [key, value] of Object.entries(values)) {
      expect(lines).toContain(`${key}=${value}`);
    }
  });

  it("leaves out keys that need an account", () => {
    expect(values).not.toHaveProperty("SENTRY_DSN");
  });
});

describe("buildExample", () => {
  const text = buildExample(sample);

  it("groups keys under their Infisical folder", () => {
    expect(text).toContain("# --- Infisical path: /api ---");
    expect(text).toContain("# --- Infisical path: /web ---");
  });

  it("describes each key and marks optional ones", () => {
    expect(text).toContain("# A signing secret\nSECRET=");
    expect(text).toContain("# Error reporting Optional.\nSENTRY_DSN=");
  });

  it("shows where to get a key and its local value", () => {
    expect(text).toContain(
      "# Postgres connection string Where: Neon dashboard\nDATABASE_URL=postgres://localhost/db"
    );
  });

  it("says where a key that is only sometimes optional is required", () => {
    expect(text).toContain(
      "# Needed wherever Novu is used Required in staging, prod; optional elsewhere.\nNOVU_KEY="
    );
  });

  it("never prints a generated secret", () => {
    expect(text).not.toContain("generated");
  });

  it("matches the committed .env.example (run `pnpm env:example` if this fails)", () => {
    const committed = readFileSync(
      path.join(import.meta.dirname, "..", "..", "..", ".env.example"),
      "utf-8"
    );
    expect(committed).toBe(buildExample(registry));
  });
});
