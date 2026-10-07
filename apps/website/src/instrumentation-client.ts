import {
  initClient,
  reportRouterTransition,
} from "@repo/observability/next/client";

// Starts error reporting in the browser. Does nothing without a Sentry DSN.
initClient("website");

export const onRouterTransitionStart = reportRouterTransition;
