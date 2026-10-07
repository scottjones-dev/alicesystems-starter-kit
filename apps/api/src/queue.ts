import { createJobs } from "@repo/jobs/runtime";
import type { Logger } from "@repo/observability/log";

import { jobs } from "./jobs/registry";

interface QueueOptions {
  connectionString: string;
  logger: Logger;
  reportError: (
    error: unknown,
    context: { attempt: number; jobId: string; jobName: string }
  ) => void;
}

/**
 * The API's background job queue: every job in `jobs/registry.ts`, on the same database as
 * the data (so a job can be queued in the same transaction as a change). Like `index.ts` and
 * `observability.ts` it is wiring for the real environment, so it has no test of its own;
 * the queue itself is tested in @repo/jobs.
 */
export const setupQueue = ({
  connectionString,
  logger,
  reportError,
}: QueueOptions) => createJobs({ connectionString, jobs, logger, reportError });
