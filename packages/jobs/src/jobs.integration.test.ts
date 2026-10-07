import { createTestDatabase } from "@repo/db/testing";
import { loadRootEnv } from "@repo/env/load";
import { createLogger } from "@repo/observability/log";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getConstructionPlans } from "pg-boss";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { z } from "zod";

import { defineJob } from "./define";
import type { Jobs } from "./runtime";
import { createJobs } from "./runtime";

/*
 * Runs on a real Postgres 18 (`pnpm infra:postgres:up`, then `pnpm setup:local`) with the real
 * migrations applied to a throwaway database, so the queue tables are the ones a deployment
 * gets. Run with `pnpm test:integration`.
 */

loadRootEnv();

const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) {
  throw new Error("DATABASE_URL is not set. Run `pnpm setup:local` first.");
}

const POLL_SECONDS = 0.5;
const WAIT_TIMEOUT_MS = 15_000;
const WAIT_STEP_MS = 50;
const ORG_A = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f01";
const ORG_B = "0190a8e2-7c3b-7d2e-9a1f-1b2c3d4e5f02";
const SCHEMA_VERSION =
  /INSERT INTO pgboss\.version\(version\) VALUES \('(?<version>\d+)'\)/u;
const NOT_RUN_BY_APP = /not one this app runs/u;
const TWO_SAME_NAME = /Two jobs are named/u;
const POLICY_FIXED = /cannot change: use a new job name/u;
const INVALID_PAYLOAD = /expected string|Invalid/iu;

let testDatabase: Awaited<ReturnType<typeof createTestDatabase>>;
let pool: Pool;
let started: Jobs[] = [];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Polls until `check` is true, so a test waits for the worker without a fixed sleep. */
const eventually = async (check: () => boolean | Promise<boolean>) => {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    // biome-ignore lint/performance/noAwaitInLoops: polling is sequential by nature
    if (await check()) {
      return;
    }
    await sleep(WAIT_STEP_MS);
  }
  throw new Error("Timed out waiting for the jobs to run.");
};

const captureLogs = () => {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger({
    level: "debug",
    service: "jobs-test",
    write: (line) => lines.push(JSON.parse(line)),
  });
  return { lines, logger };
};

/** Builds a Jobs for the test database and remembers it, so `afterEach` can stop it. */
const setup = async (
  jobs: Parameters<typeof createJobs>[0]["jobs"],
  options: { groupConcurrency?: number; work?: boolean } = {}
) => {
  const { lines, logger } = captureLogs();
  const reportError = vi.fn();
  const runner = createJobs({
    connectionString: testDatabase.url,
    groupConcurrency: options.groupConcurrency,
    jobs,
    logger,
    pollingIntervalSeconds: POLL_SECONDS,
    reportError,
  });
  started.push(runner);
  await runner.start({ work: options.work ?? true });
  return { lines, reportError, runner };
};

const countJobs = async (name: string, state?: string) => {
  const { rows } = await pool.query<{ n: number }>(
    `select count(*)::int as n from pgboss.job where name = $1 ${
      state ? "and state = $2" : ""
    }`,
    state ? [name, state] : [name]
  );
  return rows[0]?.n ?? 0;
};

beforeAll(async () => {
  testDatabase = await createTestDatabase(adminUrl, "jobs_test");
  pool = new Pool({ connectionString: testDatabase.url });
});

afterEach(async () => {
  for (const runner of started) {
    // biome-ignore lint/performance/noAwaitInLoops: stopped one at a time so a failure names itself
    await runner.stop({ timeoutMs: 5000 }).catch(() => undefined);
  }
  started = [];
});

afterAll(async () => {
  await pool.end();
  await testDatabase.drop();
});

describe("the queue's tables", () => {
  it("come from the migration, at the version this pg-boss expects", async () => {
    const expected = SCHEMA_VERSION.exec(getConstructionPlans("pgboss"))?.groups
      ?.version;
    const { rows } = await pool.query<{ version: number }>(
      "select version from pgboss.version"
    );

    expect(String(rows[0]?.version)).toBe(expected);
  });
});

describe("running a job", () => {
  it("runs a queued job with its checked payload and a logger carrying its id", async () => {
    const seen = vi.fn();
    const job = defineJob({
      handler: (payload, { jobId, logger }) => {
        logger.info("handled");
        seen(payload, jobId);
      },
      name: "test.hello",
      // The default is filled in by the schema, so the handler gets the output, not the input.
      schema: z.object({ greeting: z.string().default("hi"), id: z.uuid() }),
    });
    const { lines, runner } = await setup([job]);

    const { id } = await runner.enqueue(job, { id: ORG_A });
    await eventually(() => seen.mock.calls.length === 1);

    expect(seen).toHaveBeenCalledWith({ greeting: "hi", id: ORG_A }, id);
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          job: "test.hello",
          jobId: id,
          msg: "handled",
        }),
        expect.objectContaining({ msg: "job done" }),
      ])
    );
  });

  it("refuses a wrong payload when queueing, and a job the app does not run", async () => {
    const job = defineJob({
      handler: () => undefined,
      name: "test.strict",
      schema: z.object({ id: z.uuid() }),
    });
    const other = defineJob({
      handler: () => undefined,
      name: "test.other",
      schema: z.object({}),
    });
    const { runner } = await setup([job], { work: false });

    // @ts-expect-error `id` must be a string.
    await expect(runner.enqueue(job, { id: 5 })).rejects.toThrow(
      INVALID_PAYLOAD
    );
    await expect(runner.enqueue(other, {})).rejects.toThrow(NOT_RUN_BY_APP);
    expect(await countJobs("test.strict")).toBe(0);
  });

  it("refuses two jobs with the same name", () => {
    const job = defineJob({
      handler: () => undefined,
      name: "test.twice",
      schema: z.object({}),
    });

    expect(() =>
      createJobs({
        connectionString: testDatabase.url,
        jobs: [job, job],
        logger: captureLogs().logger,
      })
    ).toThrow(TWO_SAME_NAME);
  });

  it("queues jobs without running them when the process is not a worker", async () => {
    const ran = vi.fn();
    const job = defineJob({
      handler: ran,
      name: "test.producer_only",
      schema: z.object({}),
    });
    const { runner } = await setup([job], { work: false });

    await runner.enqueue(job, {});
    await sleep(POLL_SECONDS * 3000);

    expect(ran).not.toHaveBeenCalled();
    expect(await countJobs("test.producer_only", "created")).toBe(1);
  });
});

describe("failing and retrying", () => {
  it("retries a failed job, reporting each failure with its try number", async () => {
    let tries = 0;
    const job = defineJob({
      handler: () => {
        tries += 1;
        if (tries === 1) {
          throw new Error("first try fails");
        }
      },
      name: "test.flaky",
      retry: { backoff: false, delaySeconds: 1, limit: 2 },
      schema: z.object({}),
    });
    const { lines, reportError, runner } = await setup([job]);

    const { id } = await runner.enqueue(job, {});
    await eventually(() => tries === 2);
    await eventually(
      async () => (await countJobs("test.flaky", "completed")) === 1
    );

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      attempt: 0,
      jobId: id,
      jobName: "test.flaky",
    });
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          final: false,
          level: "error",
          msg: "job failed, will retry",
        }),
      ])
    );
  });

  it("gives up after the retry limit and leaves the job as failed, where it can be seen", async () => {
    const job = defineJob({
      handler: () => {
        throw new Error("always fails");
      },
      name: "test.broken",
      retry: { backoff: false, delaySeconds: 1, limit: 1 },
      schema: z.object({}),
    });
    const { lines, reportError, runner } = await setup([job]);

    await runner.enqueue(job, {});
    await eventually(
      async () => (await countJobs("test.broken", "failed")) === 1
    );

    expect(reportError).toHaveBeenCalledTimes(2);
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ final: true, msg: "job failed for good" }),
      ])
    );
  });

  it("fails a job whose stored payload no longer matches the schema", async () => {
    const job = defineJob({
      handler: vi.fn(),
      name: "test.drifted",
      retry: { limit: 0 },
      schema: z.object({ id: z.uuid() }),
    });
    const { runner } = await setup([job], { work: false });
    // Written straight into the queue, as an older version of the code might have left it.
    await pool.query(
      "insert into pgboss.job (name, data, policy, retry_limit) select 'test.drifted', '{\"id\":\"nope\"}'::jsonb, policy, 0 from pgboss.queue where name = 'test.drifted'"
    );
    await runner.stop({ timeoutMs: 2000 });
    const { reportError, runner: worker } = await setup([job]);

    await eventually(
      async () => (await countJobs("test.drifted", "failed")) === 1
    );

    expect(job.handler).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledTimes(1);
    await worker.stop({ timeoutMs: 2000 });
  });
});

describe("queueing safely", () => {
  it("queues a job with the same dedupe key only once while it waits", async () => {
    const job = defineJob({
      dedupeKey: (payload) => `run:${payload.month}`,
      handler: () => undefined,
      name: "test.invoice_run",
      schema: z.object({ month: z.string() }),
    });
    const { runner } = await setup([job], { work: false });

    const first = await runner.enqueue(job, { month: "2026-10" });
    const second = await runner.enqueue(job, { month: "2026-10" });
    const other = await runner.enqueue(job, { month: "2026-11" });

    expect(first.id).not.toBeNull();
    expect(second.id).toBeNull();
    expect(other.id).not.toBeNull();
    expect(await countJobs("test.invoice_run")).toBe(2);
  });

  it("queues the job in the caller's transaction: kept on commit, gone on rollback", async () => {
    const job = defineJob({
      handler: () => undefined,
      name: "test.transactional",
      schema: z.object({ n: z.number() }),
    });
    const { runner } = await setup([job], { work: false });
    const db = drizzle({ client: pool });

    await expect(
      db.transaction(async (transaction) => {
        await runner.enqueue(job, { n: 1 }, { transaction });
        throw new Error("the change failed");
      })
    ).rejects.toThrow("the change failed");
    expect(await countJobs("test.transactional")).toBe(0);

    await db.transaction(async (transaction) => {
      await runner.enqueue(job, { n: 2 }, { transaction });
    });
    expect(await countJobs("test.transactional")).toBe(1);
  });

  it("holds a delayed job back until its time", async () => {
    const ran = vi.fn();
    const job = defineJob({
      handler: ran,
      name: "test.later",
      schema: z.object({}),
    });
    const { runner } = await setup([job]);

    await runner.enqueue(job, {}, { runAfter: { seconds: 2 } });
    await sleep(1000);
    expect(ran).not.toHaveBeenCalled();

    await eventually(() => ran.mock.calls.length === 1);
  });
});

describe("a fair share per organization", () => {
  it("never runs more of one organization's jobs at once than the limit, while others carry on", async () => {
    const running = new Map<string, number>();
    const peak = new Map<string, number>();
    let overall = 0;
    let overallPeak = 0;
    let finished = 0;
    const job = defineJob({
      concurrency: 4,
      group: (payload) => payload.organization_id,
      handler: async (payload) => {
        const org = payload.organization_id;
        running.set(org, (running.get(org) ?? 0) + 1);
        overall += 1;
        peak.set(org, Math.max(peak.get(org) ?? 0, running.get(org) ?? 0));
        overallPeak = Math.max(overallPeak, overall);
        await sleep(400);
        running.set(org, (running.get(org) ?? 1) - 1);
        overall -= 1;
        finished += 1;
      },
      name: "test.fair",
      schema: z.object({ organization_id: z.uuid() }),
    });
    const { runner } = await setup([job], { groupConcurrency: 1 });

    for (const organization_id of [ORG_A, ORG_A, ORG_A, ORG_B, ORG_B]) {
      // biome-ignore lint/performance/noAwaitInLoops: queued in order
      await runner.enqueue(job, { organization_id });
    }
    await eventually(() => finished === 5);

    expect(peak.get(ORG_A)).toBe(1);
    expect(peak.get(ORG_B)).toBe(1);
    // Two organizations did run side by side: one tenant did not hold up the other.
    expect(overallPeak).toBe(2);
  });
});

describe("schedules", () => {
  const schedules = async () => {
    const { rows } = await pool.query<{
      cron: string;
      name: string;
      timezone: string;
    }>("select name, cron, timezone from pgboss.schedule order by name");
    return rows;
  };

  it("keeps the schedule of every scheduled job, and removes one when its job is dropped", async () => {
    const nightly = defineJob({
      handler: () => undefined,
      name: "test.nightly",
      schedule: { cron: "0 3 * * *", timezone: "Europe/London" },
      schema: z.object({}),
    });
    const hourly = defineJob({
      handler: () => undefined,
      name: "test.hourly",
      schedule: { cron: "0 * * * *" },
      schema: z.object({}),
    });

    const first = await setup([nightly, hourly]);
    expect(await schedules()).toStrictEqual(
      [
        { cron: "0 3 * * *", name: "test.nightly", timezone: "Europe/London" },
        { cron: "0 * * * *", name: "test.hourly", timezone: "UTC" },
      ].sort((a, b) => a.name.localeCompare(b.name))
    );
    await first.runner.stop({ timeoutMs: 2000 });

    await setup([nightly]);
    expect((await schedules()).map((row) => row.name)).toStrictEqual([
      "test.nightly",
    ]);
  });

  it("does not let a scheduled run overlap the one before it", async () => {
    const job = defineJob({
      handler: () => undefined,
      name: "test.no_overlap",
      schedule: { cron: "* * * * *" },
      schema: z.object({}),
    });
    const { runner } = await setup([job], { work: false });

    const first = await runner.enqueue(job, {});
    const second = await runner.enqueue(job, {});

    expect(first.id).not.toBeNull();
    expect(second.id).toBeNull();
  });
});

describe("a queue's policy", () => {
  it("cannot change after the queue exists, and says so", async () => {
    const plain = defineJob({
      handler: () => undefined,
      name: "test.policy",
      schema: z.object({}),
    });
    const keyed = defineJob({
      dedupeKey: () => "k",
      handler: () => undefined,
      name: "test.policy",
      schema: z.object({}),
    });
    const { runner } = await setup([plain], { work: false });
    await runner.stop({ timeoutMs: 2000 });

    await expect(setup([keyed], { work: false })).rejects.toThrow(POLICY_FIXED);
  });
});

describe("stopping", () => {
  it("lets a running job finish before it returns", async () => {
    let finished = false;
    let startedRunning = false;
    const job = defineJob({
      handler: async () => {
        startedRunning = true;
        await sleep(1500);
        finished = true;
      },
      name: "test.slow",
      schema: z.object({}),
    });
    const { runner } = await setup([job]);

    await runner.enqueue(job, {});
    await eventually(() => startedRunning);
    await runner.stop({ timeoutMs: 10_000 });

    expect(finished).toBe(true);
  });
});
