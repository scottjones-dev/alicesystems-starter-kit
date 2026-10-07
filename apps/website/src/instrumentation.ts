import {
  createRegister,
  reportRequestError,
} from "@repo/observability/next/instrumentation";

// Starts error reporting when the server starts. Does nothing without a Sentry DSN.
export const register = createRegister("website");

// Reports errors thrown while a request is being served.
export const onRequestError = reportRequestError;
