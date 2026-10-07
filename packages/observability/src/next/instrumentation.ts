import { captureRequestError, init } from "@sentry/nextjs";

import { baseSentryOptions } from "../options";

/*
 * The server half of Sentry for a Next.js app. The app's `instrumentation.ts` is two lines:
 *
 *   export const register = createRegister("website");
 *   export const onRequestError = reportRequestError;
 *
 * `process.env.NEXT_PUBLIC_*` is written out in full on purpose: Next replaces it when it
 * builds, and only that exact spelling is replaced.
 */

/** Sentry's hook for errors thrown while a request is being served. */
export const reportRequestError = captureRequestError;

/**
 * Builds the `register` function Next calls once when the server starts. `app` names the app
 * (website, platform) so errors from the two can be told apart in the one Sentry project.
 */
export const createRegister = (app: string) => () => {
  // Only the Node runtime is set up: these apps have no edge routes (see the observability docs).
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  init({
    ...baseSentryOptions({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    }),
    initialScope: { tags: { app } },
  });
};
