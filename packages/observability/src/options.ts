import type { Scrubber } from "./scrub";
import { defaultScrubber } from "./scrub";

export interface SentryBaseInput {
  /** The project's DSN. Without one, Sentry stays off and nothing is sent. */
  dsn?: string;
  environment: string;
  /** Usually the git commit SHA, set by CI. */
  release?: string;
  /** Add your own words to the rules with `createScrubber({ extraKeys })` and pass it here. */
  scrubber?: Scrubber;
}

/**
 * The Sentry options every runtime shares. Each app passes the result to its own
 * `Sentry.init(...)`, so this file needs no SDK.
 *
 * Privacy:
 * - `sendDefaultPii` is off, and events and breadcrumbs go through the scrubber.
 * - There is deliberately no replay, screenshot, view-hierarchy, profiling or local-variable
 *   setting here, and no console forwarding. Do not add one without a privacy review.
 * - Performance tracing is off: spans carry full addresses and database text that the
 *   scrubber does not cover. Turn it on only after extending the scrubber to spans.
 */
export const baseSentryOptions = ({
  dsn,
  environment,
  release,
  scrubber = defaultScrubber,
}: SentryBaseInput) => ({
  beforeBreadcrumb: scrubber.scrubBreadcrumb,
  beforeSend: scrubber.scrubEvent,
  dsn,
  enabled: Boolean(dsn),
  environment,
  // Expected noise: cancelled requests, a browser quirk, and being offline.
  ignoreErrors: [
    "AbortError",
    "Network request failed",
    "ResizeObserver loop completed with undelivered notifications",
  ],
  release,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
