import type { Hook } from "@hono/zod-openapi";
import { AppError } from "@repo/errors/app-error";

import type { AppBindings } from "./types";

/**
 * Turns a failed Zod parse into our standard VALIDATION_FAILED error.
 *
 * The message is fixed and `fields` holds paths only. A rejected value could be a child's
 * name or a note, so nothing the client sent is ever echoed back.
 */
export const validationHook: Hook<unknown, AppBindings, string, undefined> = (
  result
) => {
  if (result.success) {
    return;
  }
  const fields = result.error.issues.map((issue) => issue.path.join("."));
  throw new AppError(
    "VALIDATION_FAILED",
    "Some of the information sent is not valid",
    // Several issues can point at the same field; list each field once.
    { fields: [...new Set(fields)] }
  );
};
