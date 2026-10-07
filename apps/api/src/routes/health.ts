import { createRoute, z } from "@hono/zod-openapi";
import { AppError } from "@repo/errors/app-error";

import { createRouter } from "../lib/create-app";
import { errorResponses, jsonContent } from "../lib/responses";

const okSchema = z.object({ ok: z.literal(true) });

const tags = ["Health"];

const liveness = createRoute({
  description:
    "The process is up. Never touches the database, so a database outage does not restart a healthy API.",
  method: "get",
  path: "/healthz",
  responses: {
    200: jsonContent(okSchema, "The process is up"),
    ...errorResponses(["INTERNAL"]),
  },
  tags,
});

const readiness = createRoute({
  description:
    "This instance can serve requests, which needs the database. A load balancer uses it to stop sending traffic here until the database is back.",
  method: "get",
  path: "/readyz",
  responses: {
    200: jsonContent(okSchema, "The database answers"),
    ...errorResponses(["UNAVAILABLE", "INTERNAL"]),
  },
  tags,
});

interface HealthDeps {
  /** Resolves when the database answers quickly, rejects when it does not. */
  checkDatabase: () => Promise<void>;
}

export const createHealthRouter = ({ checkDatabase }: HealthDeps) => {
  const router = createRouter();

  router.openapi(liveness, (c) => c.json({ ok: true as const }, 200));

  router.openapi(readiness, async (c) => {
    try {
      await checkDatabase();
    } catch (error) {
      // The cause stays on the server: toErrorBody never sends it to a client.
      // biome-ignore lint/style/useErrorCause: AppError takes its cause in the options object, as passed here
      throw new AppError("UNAVAILABLE", "The database is not answering", {
        cause: error,
      });
    }
    return c.json({ ok: true as const }, 200);
  });

  return router;
};
