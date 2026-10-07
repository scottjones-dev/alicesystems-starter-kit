import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defineJob } from "./define";
import { constructionSql, upgradeSql } from "./schema-sql";

const STARTS_WITH_BEGIN = /^\s*BEGIN;/mu;
const STARTS_WITH_COMMIT = /^\s*COMMIT;/mu;
const NOT_A_NAME = /not a job name/u;
const EMPTY_PAYLOAD = /schema must accept \{\}/u;

const noop = () => undefined;

describe("defineJob", () => {
  it("returns the definition unchanged", () => {
    const job = defineJob({
      handler: noop,
      name: "reminders.send",
      schema: z.object({ id: z.uuid() }),
    });

    expect(job.name).toBe("reminders.send");
  });

  it.each([
    "send",
    "Reminders.send",
    "reminders.Send",
    "reminders.send-now",
    "reminders send",
    ".send",
    "reminders.",
    "1reminders.send",
  ])("refuses the name %s", (name) => {
    expect(() =>
      defineJob({ handler: noop, name, schema: z.object({}) })
    ).toThrow(NOT_A_NAME);
  });

  it("accepts a deeper name", () => {
    expect(() =>
      defineJob({
        handler: noop,
        name: "invoices.run.monthly",
        schema: z.object({}),
      })
    ).not.toThrow();
  });

  it("refuses a scheduled job whose payload needs fields, because a schedule sends none", () => {
    expect(() =>
      defineJob({
        handler: noop,
        name: "cleanup.nightly",
        schedule: { cron: "0 3 * * *" },
        schema: z.object({ organization_id: z.uuid() }),
      })
    ).toThrow(EMPTY_PAYLOAD);
  });

  it("accepts a scheduled job with an empty payload", () => {
    expect(() =>
      defineJob({
        handler: noop,
        name: "cleanup.nightly",
        schedule: { cron: "0 3 * * *" },
        schema: z.object({}),
      })
    ).not.toThrow();
  });
});

describe("pg-boss schema SQL", () => {
  it("installs into its own schema and leaves the transaction to the migration runner", () => {
    const sql = constructionSql();

    expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS pgboss");
    expect(sql).toContain("CREATE TABLE pgboss.job");
    expect(sql).not.toMatch(STARTS_WITH_BEGIN);
    expect(sql).not.toMatch(STARTS_WITH_COMMIT);
  });

  it("can build the upgrade from an older schema version", () => {
    expect(upgradeSql(40)).toContain("pgboss");
  });
});
