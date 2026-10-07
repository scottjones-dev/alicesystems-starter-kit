import { withSentryConfig } from "@sentry/nextjs/config";

/** Where the EU organization lives. A US address would reject the upload. */
const SENTRY_EU_URL = "https://de.sentry.io/";

/**
 * Wraps an app's Next.js config so the build uploads source maps to Sentry (readable stack
 * traces) and then deletes them from the build output, so they are never served to visitors.
 *
 * The upload needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` at build time.
 * Without them the build still works: it just skips the upload.
 */
export const withObservability = <Config extends object>(
  config: Config
): Config =>
  withSentryConfig(config, {
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    // Source maps are uploaded to the EU region, where our Sentry organization lives.
    sentryUrl: SENTRY_EU_URL,
    // Build output stays quiet except in CI, where an upload failure should be visible.
    silent: !process.env.CI,
    sourcemaps: { deleteSourcemapsAfterUpload: true },
    // Sentry's own usage reporting is off: nothing about our builds is sent to it.
    telemetry: false,
    // A larger set of files, for stack traces that point at the right line.
    widenClientFileUpload: true,
  }) as Config;
