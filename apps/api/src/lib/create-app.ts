import { OpenAPIHono } from "@hono/zod-openapi";
import { app as appConfig } from "@repo/config/app";
import { AppError, toErrorBody } from "@repo/errors/app-error";
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

/** A router for one feature. Its validation errors use our standard body. */
export const createRouter = () =>
  new OpenAPIHono<AppBindings>({ defaultHook: validationHook });

export interface AppShellOptions {
  /** Shows the real error message in the log. Off in production, where a message can quote data. */
  isDevelopment: boolean;
  /** Where unexpected errors are written. */
  log?: (message: string, details: Record<string, string>) => void;
  /** The one browser origin allowed to call the API (the platform app). */
  webOrigin: string;
}

/**
 * The app shell every route sits in: request id, the standard error body, security headers,
 * CORS and a body limit, under the API base path. Features are mounted on it in `app.ts`.
 */
export const createApp = ({
  isDevelopment,
  log = (message, details) => console.error(message, details),
  webOrigin,
}: AppShellOptions) => {
  const base = createRouter().basePath(appConfig.api.basePath);

  // Every response carries a request id, and so does every error body.
  base.use(requestId());

  // One error shape for the whole API: { error: { code, message, requestId } }.
  // An AppError becomes its own status; anything else is a bug and shows a generic 500.
  base.onError((thrown, c) => {
    if (thrown instanceof HTTPException) {
      return thrown.getResponse();
    }
    const id = c.get("requestId");
    if (!(thrown instanceof AppError)) {
      log("unhandled error", {
        error: isDevelopment ? thrown.message : "(hidden in production)",
        name: thrown.name,
        requestId: id,
      });
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
