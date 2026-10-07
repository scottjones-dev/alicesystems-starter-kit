import { baseSentryOptions } from "@repo/observability/options";
import { init } from "@sentry/react-native";

/*
 * Starts crash and error reporting. It needs no SDK-specific privacy settings of its own: the
 * shared options already turn off everything that could capture the screen (no replay, no
 * screenshots, no view hierarchy) and scrub what is sent. With no DSN set, nothing is sent.
 *
 * `process.env.EXPO_PUBLIC_*` is written out in full on purpose: Expo replaces it when it
 * bundles, and only that exact spelling is replaced.
 */
export const initObservability = () => {
  init(
    baseSentryOptions({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment:
        process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ??
        (process.env.NODE_ENV === "production" ? "production" : "development"),
    })
  );
};
