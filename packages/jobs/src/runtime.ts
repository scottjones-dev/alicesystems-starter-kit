import type { Logger } from "@repo/observability/log";
import { sql } from "drizzle-orm";
import type { DrizzleTransactionLike } from "pg-boss";
import { fromDrizzle, PgBoss } from "pg-boss";
import type { z } from "zod";

import type { AnyJob, JobDefinition, RetryPolicy } from "./define";
import { PGBOSS_SCHEMA } from "./schema-sql";

/*
 * Runs jobs on pg-boss, a queue kept in Postgres. Nothing outside this file knows pg-boss is
 * there: jobs are `defineJob(...)` definitions, work is queued with `enqueue(...)`, and
 * swapping the queue for another (Redis, say) means rewriting only this file.
 *
 * Delivery is at least once: a job that fails, or whose worker dies, runs again. Every job
 * must be safe to run twice.
 */

const DEFAULT_RETRY_LIMIT = 3;
const DEFAULT_RETRY_DELAY_SECONDS = 30;
const DEFAULT_RETRY_MAX_DELAY_SECONDS = 3600;
const DEFAULT_TIMEOUT_SECONDS = 900;
const DEFAULT_POLLING_SECONDS = 2;
/** How many jobs of one group (organization) one process runs at once. */
const DEFAULT_GROUP_CONCURRENCY = 2;
const DEFAULT_MAX_CONNECTIONS = 5;
/** How long `stop` waits for running jobs to finish before giving up on them. */
const DEFAULT_STOP_TIMEOUT_MS = 20_000;

export interface JobsOptions {
  /** The database to keep the queue in (the same one as the app's data). */
  connectionString: string;
  /** How many jobs of one group (organization) one process runs at once. Default 2. */
  groupConcurrency?: number;
  jobs: readonly AnyJob[];
  logger: Logger;
  /** Connections the queue may use. Default 5. */
  maxConnections?: number;
  /** How often an idle worker looks for work, in seconds. Default 2. */
  pollingIntervalSeconds?: number;
  /** Sends a failure to error reporting (Sentry). Called on every failed try. */
  reportError?: (
    error: unknown,
    context: { attempt: number; jobId: string; jobName: string }
  ) => void;
}

export interface EnqueueOptions {
  /** Wait until then, or this many seconds, before the job may run. */
  runAfter?: Date | { seconds: number };
  /**
   * The transaction to queue the job in. The job then exists only if that transaction
   * commits: queue it in the same transaction as the change that needs it.
   */
  transaction?: DrizzleTransactionLike;
}

export interface EnqueueResult {
  /** Null when `dedupeKey` found the same job already waiting, so nothing new was queued. */
  id: string | null;
}

/** The queue behaviour a job definition asks for. */
type QueuePolicy = "exclusive" | "short" | "standard";

const policyOf = (job: AnyJob): QueuePolicy => {
  if (job.schedule) {
    // A scheduled run is skipped while the previous one is still waiting or running.
    return "exclusive";
  }
  return job.dedupeKey ? "short" : "standard";
};

const retryOptions = (retry: RetryPolicy = {}) => {
  const backoff = retry.backoff ?? true;
  return {
    retryBackoff: backoff,
    retryDelay: retry.delaySeconds ?? DEFAULT_RETRY_DELAY_SECONDS,
    // pg-boss only accepts a longest wait when waits grow, and rejects the key even as undefined.
    ...(backoff && {
      retryDelayMax: retry.maxDelaySeconds ?? DEFAULT_RETRY_MAX_DELAY_SECONDS,
    }),
    retryLimit: retry.limit ?? DEFAULT_RETRY_LIMIT,
  };
};

export const createJobs = ({
  connectionString,
  groupConcurrency = DEFAULT_GROUP_CONCURRENCY,
  jobs,
  logger,
  maxConnections = DEFAULT_MAX_CONNECTIONS,
  pollingIntervalSeconds = DEFAULT_POLLING_SECONDS,
  reportError,
}: JobsOptions) => {
  const byName = new Map<string, AnyJob>();
  for (const job of jobs) {
    if (byName.has(job.name)) {
      throw new Error(`Two jobs are named "${job.name}".`);
    }
    byName.set(job.name, job);
  }

  const boss = new PgBoss({
    application_name: "repo-jobs",
    connectionString,
    // The tables come from a migration in @repo/db, not from pg-boss at start-up, so the app
    // needs no right to alter them (see the README).
    createSchema: false,
    max: maxConnections,
    migrate: false,
    schema: PGBOSS_SCHEMA,
  });
  boss.on("error", (error) => {
    logger.error("jobs queue error", { error });
    reportError?.(error, { attempt: 0, jobId: "", jobName: "queue" });
  });
  boss.on("warning", (warning) => {
    logger.warn("jobs queue warning", { warning: warning.message });
  });

  /** Creates a job's queue if it is new, and refuses a change to what cannot change. */
  const ensureQueue = async (job: AnyJob) => {
    const policy = policyOf(job);
    const existing = await boss.getQueue(job.name);
    if (existing) {
      if (existing.policy !== policy) {
        throw new Error(
          `The queue "${job.name}" was created as "${existing.policy}" but the job now needs "${policy}". ` +
            "A queue's policy cannot change: use a new job name."
        );
      }
      await boss.updateQueue(job.name, {
        ...retryOptions(job.retry),
        expireInSeconds: job.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
      });
      return;
    }
    await boss.createQueue(job.name, {
      ...retryOptions(job.retry),
      expireInSeconds: job.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
      policy,
    });
  };

  /** Makes the schedules in the database match the jobs: adds new ones, removes the dropped. */
  const syncSchedules = async () => {
    const scheduled = jobs.filter((job) => job.schedule);
    await Promise.all(
      scheduled.map((job) =>
        boss.schedule(
          job.name,
          job.schedule?.cron ?? "",
          {},
          {
            missed: job.schedule?.missed ?? "skip",
            tz: job.schedule?.timezone ?? "UTC",
          }
        )
      )
    );
    const wanted = new Set(scheduled.map((job) => job.name));
    const stale = (await boss.getSchedules()).filter(
      (schedule) => !wanted.has(schedule.name)
    );
    await Promise.all(
      stale.map(async (schedule) => {
        await boss.unschedule(schedule.name, schedule.key);
        logger.info("removed a schedule that no job asks for", {
          job: schedule.name,
        });
      })
    );
  };

  const runJob = async (
    job: AnyJob,
    queued: {
      data: unknown;
      id: string;
      retryCount: number;
      signal: AbortSignal;
    }
  ) => {
    const attempt = queued.retryCount;
    const log = logger.child({ attempt, job: job.name, jobId: queued.id });
    const started = performance.now();
    try {
      // Checked again here: the payload sat in the database, possibly from an older version.
      const payload = job.schema.parse(queued.data);
      await job.handler(payload, {
        attempt,
        jobId: queued.id,
        logger: log,
        signal: queued.signal,
      });
      log.info("job done", {
        durationMs: Math.round(performance.now() - started),
      });
    } catch (error) {
      const limit = job.retry?.limit ?? DEFAULT_RETRY_LIMIT;
      const final = attempt >= limit;
      log.error(final ? "job failed for good" : "job failed, will retry", {
        durationMs: Math.round(performance.now() - started),
        error,
        final,
      });
      reportError?.(error, { attempt, jobId: queued.id, jobName: job.name });
      // Thrown again so pg-boss records the failure and schedules the retry.
      throw error;
    }
  };

  const registerWorker = (job: AnyJob) =>
    boss.work(
      job.name,
      {
        batchSize: 1,
        // In this process only: it is exact. pg-boss's cross-process limit can be overshot a little
        // when several workers fetch in the same instant.
        localConcurrency: job.concurrency ?? 1,
        // The group limit cannot be higher than the number of workers for the job.
        localGroupConcurrency: Math.min(groupConcurrency, job.concurrency ?? 1),
        pollingIntervalSeconds,
      },
      async ([queued]) => {
        if (queued) {
          await runJob(job, queued);
        }
      }
    );

  return {
    /**
     * Queues a job. The payload is checked against the job's schema first, so a wrong payload
     * fails here, where the bug is, not later in a worker.
     */
    enqueue: async <Schema extends z.ZodType>(
      job: JobDefinition<Schema>,
      payload: z.input<Schema>,
      options: EnqueueOptions = {}
    ): Promise<EnqueueResult> => {
      if (byName.get(job.name) !== job) {
        throw new Error(`The job "${job.name}" is not one this app runs.`);
      }
      const data = job.schema.parse(payload);
      const group = job.group?.(data);
      const startAfter =
        options.runAfter instanceof Date
          ? options.runAfter
          : options.runAfter?.seconds;
      const id = await boss.send(job.name, data as object, {
        db: options.transaction
          ? fromDrizzle(options.transaction, sql)
          : undefined,
        group: group ? { id: group } : undefined,
        singletonKey: job.dedupeKey?.(data),
        startAfter,
      });
      return { id };
    },

    /**
     * Connects, creates the queues, and (with `work`) starts running jobs and keeping the
     * schedules. An app that only queues jobs, never runs them, passes `work: false`.
     */
    start: async ({ work }: { work: boolean }) => {
      await boss.start();
      await Promise.all(jobs.map(ensureQueue));
      if (!work) {
        return;
      }
      await syncSchedules();
      await Promise.all(jobs.map(registerWorker));
      logger.info("jobs started", { jobs: jobs.length });
    },

    /** Stops taking new jobs, waits for running ones to finish (up to `timeoutMs`), disconnects. */
    stop: async ({ timeoutMs = DEFAULT_STOP_TIMEOUT_MS } = {}) => {
      await boss.stop({
        close: true,
        graceful: true,
        timeout: timeoutMs,
      });
      logger.info("jobs stopped");
    },
  };
};

export type Jobs = ReturnType<typeof createJobs>;
