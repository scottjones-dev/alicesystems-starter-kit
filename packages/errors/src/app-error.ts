import { z } from "zod";
import type { ErrorCode } from "./codes";
import { errorCodeNames, statusByCode } from "./codes";

/** The HTTP statuses an error body can be sent with. */
export type ErrorStatus = (typeof statusByCode)[ErrorCode];

interface AppErrorOptions {
  cause?: unknown;
  /** Whether the message is safe to show to the user. Defaults to true except for INTERNAL. */
  expose?: boolean;
  /** For VALIDATION_FAILED: the paths of the invalid inputs. Paths only, never values. */
  fields?: string[];
}

/**
 * An error we expect and can explain. Throw it from an API handler and the API turns it
 * into the standard error body with the right status. Anything that is not an AppError is
 * treated as a bug: it is reported and the user sees a generic message.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly expose: boolean;
  readonly fields?: string[];

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.expose = options.expose ?? code !== "INTERNAL";
    this.fields = options.fields;
  }

  get status(): ErrorStatus {
    return statusByCode[this.code];
  }
}

/** The shape of every error the API returns. Clients parse this and branch on `code`. */
export const errorBodySchema = z.object({
  error: z.object({
    code: z.enum(errorCodeNames),
    /** Paths of the invalid fields (VALIDATION_FAILED only). Never the rejected values. */
    fields: z.array(z.string()).optional(),
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export interface ErrorResponse {
  body: ErrorBody;
  status: ErrorStatus;
}

/**
 * Turns anything that was thrown into a status and a body that is safe to send to a client.
 * Takes `unknown` because JavaScript lets code throw any value, not only Errors.
 */
export const toErrorBody = (
  error: unknown,
  requestId?: string
): ErrorResponse => {
  if (error instanceof AppError) {
    return {
      body: {
        error: {
          code: error.code,
          // Only added when there are some, so every other error keeps its exact shape.
          ...(error.fields && { fields: error.fields }),
          message: error.expose ? error.message : GENERIC_MESSAGE,
          requestId,
        },
      },
      status: error.status,
    };
  }
  // Anything else is a bug: never leak its message, stack or cause.
  return {
    body: {
      error: { code: "INTERNAL", message: GENERIC_MESSAGE, requestId },
    },
    status: statusByCode.INTERNAL,
  };
};
