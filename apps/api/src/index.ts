import { promisify } from "node:util";

import { serve } from "@hono/node-server";
import { app as appConfig } from "@repo/config/app";
import { closeDb, pingDatabase } from "@repo/db/client";
import { keys as dbKeys } from "@repo/db/keys";
import { keys as base } from "@repo/env/base";
import { keys as jobsKeys } from "@repo/jobs/keys";
import { keys as observabilityKeys } from "@repo/observability/keys";

import { buildApp } from "./app";
import { keys } from "./keys";
import { setupObservability } from "./observability";
import { setupQueue } from "./queue";
import { createShutdown } from "./shutdown";

/*
 * Starts the API. This is the only file that reads the environment and opens real
 * connections: everything else is passed what it needs, which is how the tests run it.
 */

// Long enough for a normal request to finish, short enough that a deploy is not held up.
const SHUTDOWN_TIMEOUT_MS = 10_000;
// Running jobs get most of that time to finish; the rest is left for the database and the logs.
const JOBS_STOP_TIMEOUT_MS = 7000;

const { NODE_ENV: nodeEnv, WEB_ORIGIN: webOrigin } = base.env();
const { PORT: port } = keys.env();
const isProduction = nodeEnv === "production";

// First, so errors thrown while the rest starts up are reported too.
const { flush, logger, reportError } = setupObservability({
  env: observabilityKeys.env(),
  nodeEnv,
});

// The queue shares the API's database. Whether this process also runs the jobs, or only
// queues them for a separate worker, is a setting (JOBS_WORKER).
const queue = setupQueue({
  connectionString: dbKeys.env().DATABASE_URL,
  logger,
  reportError: (error, { attempt, jobId, jobName }) =>
    reportError(error, { attempt: String(attempt), job: jobName, jobId }),
});
await queue.start({ work: jobsKeys.env().JOBS_WORKER === "true" });

const app = buildApp({
  checkDatabase: pingDatabase,
  exposeDocs: !isProduction,
  logger,
  reportError,
  webOrigin,
});

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`${appConfig.name} API listening`, {
    path: appConfig.api.basePath,
    port: info.port,
  });
});

const closeServer = async () => {
  const closed = promisify(server.close.bind(server))();
  // Idle keep-alive connections would otherwise hold the server open until they time out.
  if ("closeIdleConnections" in server) {
    server.closeIdleConnections();
  }
  await closed;
};

const shutdown = createShutdown({
  closeDatabase: closeDb,
  closeServer,
  exit: (code) => process.exit(code),
  flushObservability: flush,
  log: (message) => logger.info(message),
  stopJobs: () => queue.stop({ timeoutMs: JOBS_STOP_TIMEOUT_MS }),
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    shutdown(signal);
  });
}
