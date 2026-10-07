import type { keys } from "@repo/observability/keys";
import {
  createBetterStackShipper,
  createLogger,
} from "@repo/observability/log";
import { baseSentryOptions } from "@repo/observability/options";
import { captureException, close, init, withScope } from "@sentry/node";

type ObservabilityEnv = ReturnType<typeof keys.env>;

/** How long to wait for Sentry to send what it holds when the process stops. */
const SENTRY_FLUSH_TIMEOUT_MS = 2000;

interface SetupOptions {
  env: ObservabilityEnv;
  nodeEnv: "development" | "production" | "test";
}

/**
 * Starts error reporting and builds the logger. Each part switches on only when it has its
 * settings: no `SENTRY_DSN` means Sentry sends nothing, and without both Better Stack settings
 * the logs stay on standard output. Like `index.ts` it reads the real environment, so the
 * tests build the app with fakes instead.
 */
export const setupObservability = ({ env, nodeEnv }: SetupOptions) => {
  const shipper =
    env.BETTERSTACK_SOURCE_TOKEN && env.BETTERSTACK_INGESTING_HOST
      ? createBetterStackShipper({
          ingestingHost: env.BETTERSTACK_INGESTING_HOST,
          sourceToken: env.BETTERSTACK_SOURCE_TOKEN,
        })
      : undefined;

  const logger = createLogger({
    // A database error can quote a row, so messages are logged in development only.
    exposeErrorMessages: nodeEnv === "development",
    service: "api",
    shipper,
  });

  init(
    baseSentryOptions({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT ?? nodeEnv,
      release: env.SENTRY_RELEASE,
    })
  );

  return {
    /** Sends what is still waiting (logs and errors). Call it before the process exits. */
    flush: async () => {
      await Promise.allSettled([
        logger.flush(),
        close(SENTRY_FLUSH_TIMEOUT_MS),
      ]);
    },
    logger,
    /** Reports a bug to Sentry with tags (the request id, the job name) so it can be found from a report. */
    reportError: (error: unknown, tags: Record<string, string>) => {
      withScope((scope) => {
        scope.setTags(tags);
        captureException(error);
      });
    },
  };
};
