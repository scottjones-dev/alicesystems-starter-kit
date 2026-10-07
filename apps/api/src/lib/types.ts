import type { Logger } from "@repo/observability/log";

/** What every request carries on its context. Both are set for every request. */
export interface AppBindings {
  Variables: {
    /** Writes log lines that already carry this request's id. */
    logger: Logger;
    requestId: string;
  };
}
