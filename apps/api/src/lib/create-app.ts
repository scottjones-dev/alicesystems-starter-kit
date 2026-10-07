import { OpenAPIHono } from "@hono/zod-openapi";
import { app as appConfig } from "@repo/config/app";
import { AppError, toErrorBody } from "@repo/errors/app-error";
import type { Logger } from "@repo/observability/log";
import { defaultScrubber } from "@repo/observability/scrub";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import type { AppBindings } from "./types";
import { validationHook } from "./validation-hook";

// A small limit stops someone tying up the server with a huge body.
const MAX_BODY_BYTES = 1024 * 1024;
const CORS_MAX_AGE_SECONDS = 600;
const HEALTH_PATHS = new Set([
  `${appConfig.api.basePath}/healthz`,
  `${appConfig.api.basePath}/readyz`,
]);

/** A router for one feature. Its validation errors use our standard body. */
export const createRouter = () =>
  new OpenAPIHono<AppBindings>({ defaultHook: validationHook });

export interface AppShellOptions {
  /** Where request and error lines are written. */
  logger: Logger;
  /** Sends an unexpected error (a bug) to error reporting. Does nothing when not set. */
  reportError?: (error: unknown, context: { requestId: string }) => void;
  /** The one browser origin allowed to call the API (the platform app). */
  webOrigin: string;
}

/**
 * The app shell every route sits in: request id, the standard error body, security headers,
 * CORS and a body limit, under the API base path. Features are mounted on it in `app.ts`.
 */
export const createApp = ({
  logger,
  reportError,
  webOrigin,
}: AppShellOptions) => {
  const base = createRouter().basePath(appConfig.api.basePath);

  // Every response carries a request id, and so does every error body.
  base.use(requestId());

  // Every log line from a request carries its id, and one line says how the request went.
  base.use(async (c, next) => {
    const log = logger.child({ requestId: c.get("requestId") });
    c.set("logger", log);
    const started = performance.now();
    await next();
    // Probes hit the health routes every few seconds; keep them out of the normal log.
    const isProbe = HEALTH_PATHS.has(c.req.path);
    log[isProbe ? "debug" : "info"]("request", {
      durationMs: Math.round(performance.now() - started),
      method: c.req.method,
      // The path can hold a one-time secret (a reset link), so it is scrubbed first.
      path: defaultScrubber.scrubUrl(c.req.path),
      status: c.res.status,
    });
  });

  // One error shape for the whole API: { error: { code, message, requestId } }.
  // An AppError becomes its own status; anything else is a bug and shows a generic 500.
  base.onError((thrown, c) => {
    if (thrown instanceof HTTPException) {
      return thrown.getResponse();
    }
    const id = c.get("requestId");
    if (!(thrown instanceof AppError)) {
      c.get("logger").error("unhandled error", { error: thrown });
      reportError?.(thrown, { requestId: id });
    }
    const { body, status } = toErrorBody(thrown, id);
    return c.json(body, status);
  });
  base.notFound((c) => {
    const { body, status } = toErrorBody(
      new AppError("NOT_FOUND", "Not found"),
      c.get("requestId")
    );
    return c.json(body, status);
  });

  base.use(secureHeaders());
  base.use(
    cors({
      allowHeaders: ["Content-Type", "Authorization", "If-Match"],
      allowMethods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      exposeHeaders: ["Content-Length", "ETag", "Retry-After"],
      maxAge: CORS_MAX_AGE_SECONDS,
      origin: [webOrigin],
    })
  );
  base.use(
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw new AppError("VALIDATION_FAILED", "The request is too large");
      },
    })
  );

  return base;
};
