import type { Logger } from "@repo/observability/log";
import type { z } from "zod";

/*
 * What a job is: a name, the shape of its payload, and the code that runs. Jobs are defined
 * next to the code they belong to (an invoice run next to invoices) and listed once where the
 * app starts them. The package knows nothing about any particular job.
 *
 *   export const sendReminder = defineJob({
 *     name: "reminders.send",
 *     schema: z.object({ reminder_id: z.uuid(), organization_id: z.uuid() }),
 *     group: (payload) => payload.organization_id,
 *     handler: async (payload, { logger }) => { ... },
 *   });
 */

/** `area.what_happens`, lowercase: the name of the queue, and what shows up in logs. */
const JOB_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u;

export interface JobContext {
  /** Which try this is: 0 for the first, 1 for the first retry... */
  attempt: number;
  jobId: string;
  /** A logger that already carries the job's name and id. */
  logger: Logger;
  /** Aborted when the job runs out of time, so a long handler can stop early. */
  signal: AbortSignal;
}

/** When a job fails: how often to try again, and how long to wait. */
export interface RetryPolicy {
  /** Wait twice as long after each failure (with a little randomness). Default true. */
  backoff?: boolean;
  /** Seconds to wait before the first retry. Default 30. */
  delaySeconds?: number;
  /** Retries after the first try. Default 3, so a job runs at most 4 times. */
  limit?: number;
  /** The longest wait between tries, in seconds. Default one hour. */
  maxDelaySeconds?: number;
}

export interface ScheduleDefinition {
  /** A cron expression (`0 3 * * *`: every day at 03:00). */
  cron: string;
  /**
   * What to do about runs that came due while nothing was running (a deploy, an outage):
   * `skip` forgets them, `once` runs the job once for the most recent. Default `skip`.
   */
  missed?: "once" | "skip";
  /** The time zone the cron expression is read in, e.g. `Europe/London`. Default UTC. */
  timezone?: string;
}

export interface JobDefinition<Schema extends z.ZodType = z.ZodType> {
  /** How many of this job one process runs at the same time. Default 1. */
  concurrency?: number;
  /**
   * A key that makes queueing safe to repeat: while a job with this key is waiting, queueing
   * another with the same key adds nothing ("invoice-run:2026-10" queued twice is one job).
   * Once the job starts running, the same key can be queued again, which is what you want
   * when the data changed. Without a key, every enqueue is a job.
   */
  dedupeKey?: (payload: z.output<Schema>) => string;
  /**
   * Which share of the workers this job counts against, usually the organization: one tenant
   * with a thousand jobs cannot use every worker in the process and starve the rest. The limit
   * is per process (see `groupConcurrency` in `createJobs`).
   */
  group?: (payload: z.output<Schema>) => string;
  handler: (
    payload: z.output<Schema>,
    context: JobContext
  ) => Promise<void> | void;
  name: string;
  retry?: RetryPolicy;
  /** Run on a timer. A scheduled job gets an empty payload, so its schema must accept `{}`. */
  schedule?: ScheduleDefinition;
  schema: Schema;
  /** Seconds a run may take before it is treated as failed. Default 900 (15 minutes). */
  timeoutSeconds?: number;
}

/**
 * Checks a job's name and schedule, and returns it unchanged (its only job is to check the
 * shape and keep the types). A bad name fails when the module loads, not when a job is queued.
 */
export const defineJob = <const Schema extends z.ZodType>(
  definition: JobDefinition<Schema>
): JobDefinition<Schema> => {
  if (!JOB_NAME.test(definition.name)) {
    throw new Error(
      `"${definition.name}" is not a job name: use lowercase words with a dot, like invoices.run_monthly.`
    );
  }
  if (definition.schedule) {
    const empty = definition.schema.safeParse({});
    if (!empty.success) {
      throw new Error(
        `"${definition.name}" is scheduled, so its payload is empty: its schema must accept {}.`
      );
    }
  }
  return definition;
};

/** Any job, whatever its payload: what lists of jobs hold. */
// biome-ignore lint/suspicious/noExplicitAny: a list of jobs holds jobs with different payloads
export type AnyJob = JobDefinition<any>;
