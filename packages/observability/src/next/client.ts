import { captureRouterTransitionStart, init } from "@sentry/nextjs";

import { baseSentryOptions } from "../options";

/*
 * The browser half of Sentry for a Next.js app. The app's `instrumentation-client.ts` calls
 * `initClient("website")` and exports `onRouterTransitionStart`. There is no session replay
 * and no screenshot: see `baseSentryOptions`.
 */

/** Sentry's hook for page navigations, exported by the app so Next calls it. */
export const reportRouterTransition = captureRouterTransitionStart;

/** Starts Sentry in the browser. `app` names the app so errors can be told apart. */
export const initClient = (app: string) => {
  init({
    ...baseSentryOptions({
      // Next writes the real values in when it builds (see instrumentation.ts).
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    }),
    initialScope: { tags: { app } },
  });
};
