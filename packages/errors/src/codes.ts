/**
 * Every error the API can return. Clients branch on the code, never on the message text,
 * so wording can change without breaking an app.
 */
export const errorCodeNames = [
  "CONFLICT",
  "FORBIDDEN",
  "INTERNAL",
  "NOT_FOUND",
  "RATE_LIMITED",
  "STALE_VERSION",
  "UNAUTHORIZED",
  "UNAVAILABLE",
  "VALIDATION_FAILED",
] as const;

export type ErrorCode = (typeof errorCodeNames)[number];

/** The HTTP status each code is sent with. */
export const statusByCode = {
  // The request clashes with existing data (a duplicate, a record in use).
  CONFLICT: 409,
  // Signed in, but not allowed to do this.
  FORBIDDEN: 403,
  // A bug. The user only ever sees a generic message.
  INTERNAL: 500,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  // An edit was made against an out-of-date version (If-Match). Offline clients hit this when
  // two devices edit the same record: they fetch the current copy and re-apply their edit.
  STALE_VERSION: 412,
  // No valid session.
  UNAUTHORIZED: 401,
  // Something we depend on (a payment provider, a mail service) is down. Safe to retry later.
  UNAVAILABLE: 503,
  // The input failed validation.
  VALIDATION_FAILED: 422,
} as const satisfies Record<ErrorCode, number>;
