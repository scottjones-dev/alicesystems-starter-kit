import { createRoute, z } from "@hono/zod-openapi";
import { app as appConfig } from "@repo/config/app";
import { AppError, errorBodySchema } from "@repo/errors/app-error";
import { createLogger } from "@repo/observability/log";
import { describe, expect, it, vi } from "vitest";

import { buildApp } from "./app";
import { createApp, createRouter } from "./lib/create-app";
import { jsonContent } from "./lib/responses";

const WEB_ORIGIN = "https://app.example.com";
const BASE = appConfig.api.basePath;

/** A logger that keeps its lines, so a test can read what was logged. */
const captureLogs = (exposeErrorMessages = false) => {
  const lines: Record<string, unknown>[] = [];
  const logger = createLogger({
    exposeErrorMessages,
    level: "debug",
    service: "api",
    write: (line) => lines.push(JSON.parse(line)),
  });
  return { lines, logger };
};

const setup = (
  overrides: { checkDatabase?: () => Promise<void>; exposeDocs?: boolean } = {}
) => {
  const { lines, logger } = captureLogs();
  const reportError =
    vi.fn<(error: unknown, context: { requestId: string }) => void>();
  const app = buildApp({
    checkDatabase: overrides.checkDatabase ?? (() => Promise.resolve()),
    exposeDocs: overrides.exposeDocs ?? true,
    logger,
    reportError,
    webOrigin: WEB_ORIGIN,
  });
  return { app, lines, reportError };
};

describe("health", () => {
  it("answers liveness without touching the database", async () => {
    const checkDatabase = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error("down"));
    const { app } = setup({ checkDatabase });
    const response = await app.request(`${BASE}/healthz`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(checkDatabase).not.toHaveBeenCalled();
  });

  it("answers readiness when the database answers", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/readyz`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("answers readiness with the standard UNAVAILABLE error when it does not", async () => {
    const { app } = setup({
      checkDatabase: () => Promise.reject(new Error("connection refused")),
    });
    const response = await app.request(`${BASE}/readyz`);
    expect(response.status).toBe(503);
    const body = errorBodySchema.parse(await response.json());
    expect(body.error.code).toBe("UNAVAILABLE");
    expect(JSON.stringify(body)).not.toContain("refused");
  });
});

describe("the error contract", () => {
  it("puts a request id on every response, and in every error body", async () => {
    const { app } = setup();
    const ok = await app.request(`${BASE}/healthz`);
    expect(ok.headers.get("x-request-id")).toBeTruthy();

    const missing = await app.request(`${BASE}/nothing-here`);
    const body = errorBodySchema.parse(await missing.json());
    expect(body.error.requestId).toBe(missing.headers.get("x-request-id"));
  });

  it("keeps a request id the caller sends", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/healthz`, {
      headers: { "x-request-id": "caller-id-1" },
    });
    expect(response.headers.get("x-request-id")).toBe("caller-id-1");
  });

  it("answers an unknown route with NOT_FOUND in the standard body", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/nothing-here`);
    expect(response.status).toBe(404);
    expect(errorBodySchema.parse(await response.json()).error.code).toBe(
      "NOT_FOUND"
    );
  });

  it("turns a thrown AppError into its own status and message", async () => {
    const app = createApp({
      logger: captureLogs().logger,
      webOrigin: WEB_ORIGIN,
    });
    app.get("/teapot", () => {
      throw new AppError("FORBIDDEN", "Not for you");
    });
    const response = await app.request(`${BASE}/teapot`);
    expect(response.status).toBe(403);
    const body = errorBodySchema.parse(await response.json());
    expect(body.error).toMatchObject({
      code: "FORBIDDEN",
      message: "Not for you",
    });
  });

  it("hides the message of a bug, and logs only its name in production", async () => {
    const { lines, logger } = captureLogs();
    const app = createApp({ logger, webOrigin: WEB_ORIGIN });
    app.get("/boom", () => {
      throw new Error("password authentication failed for user postgres");
    });
    const response = await app.request(`${BASE}/boom`);
    expect(response.status).toBe(500);
    const body = errorBodySchema.parse(await response.json());
    expect(body.error.code).toBe("INTERNAL");
    expect(JSON.stringify(body)).not.toContain("postgres");
    const errorLines = lines.filter((line) => line.level === "error");
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0]).toMatchObject({
      error: { name: "Error" },
      requestId: body.error.requestId,
    });
    expect(JSON.stringify(lines)).not.toContain("postgres");
  });

  it("shows the real message in the log in development", async () => {
    const { lines, logger } = captureLogs(true);
    const app = createApp({ logger, webOrigin: WEB_ORIGIN });
    app.get("/boom", () => {
      throw new Error("something specific");
    });
    await app.request(`${BASE}/boom`);
    expect(JSON.stringify(lines)).toContain("something specific");
  });

  it("reports a bug with its request id, but not an AppError", async () => {
    const { logger } = captureLogs();
    const reportError =
      vi.fn<(error: unknown, context: { requestId: string }) => void>();
    const app = createApp({ logger, reportError, webOrigin: WEB_ORIGIN });
    app.get("/boom", () => {
      throw new Error("bug");
    });
    app.get("/known", () => {
      throw new AppError("CONFLICT", "Already exists");
    });

    const bug = await app.request(`${BASE}/boom`);
    await app.request(`${BASE}/known`);

    expect(reportError).toHaveBeenCalledTimes(1);
    const body = errorBodySchema.parse(await bug.json());
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      requestId: body.error.requestId,
    });
  });

  it("does not log an AppError as an error: it is expected, not a bug", async () => {
    const { lines, logger } = captureLogs(true);
    const app = createApp({ logger, webOrigin: WEB_ORIGIN });
    app.get("/known", () => {
      throw new AppError("CONFLICT", "Already exists");
    });
    await app.request(`${BASE}/known`);
    expect(lines.filter((line) => line.level === "error")).toHaveLength(0);
  });

  it("logs one line per request with its id, status and a scrubbed path", async () => {
    const { lines, logger } = captureLogs();
    const app = createApp({ logger, webOrigin: WEB_ORIGIN });
    app.get("/reset-password/:token", (c) => c.json({ ok: true }));

    const response = await app.request(`${BASE}/reset-password/secret-token`);

    const requestLines = lines.filter((line) => line.msg === "request");
    expect(requestLines).toHaveLength(1);
    expect(requestLines[0]).toMatchObject({
      level: "info",
      method: "GET",
      path: `${BASE}/reset-password/[Filtered]`,
      requestId: response.headers.get("x-request-id"),
      status: 200,
    });
    expect(JSON.stringify(lines)).not.toContain("secret-token");
  });

  it("keeps health probes out of the normal log", async () => {
    const { app, lines } = setup();

    await app.request(`${BASE}/healthz`);

    expect(lines.filter((line) => line.level === "info")).toHaveLength(0);
    expect(lines.filter((line) => line.level === "debug")).toHaveLength(1);
  });

  it("refuses a body over the limit with the standard error", async () => {
    const app = createApp({
      logger: captureLogs().logger,
      webOrigin: WEB_ORIGIN,
    });
    app.post("/echo", (c) => c.text("ok"));
    const big = "x".repeat(1024 * 1024 + 1);
    const response = await app.request(`${BASE}/echo`, {
      body: big,
      headers: { "content-length": String(big.length) },
      method: "POST",
    });
    expect(response.status).toBe(422);
    expect(errorBodySchema.parse(await response.json()).error.code).toBe(
      "VALIDATION_FAILED"
    );
  });
});

describe("validation", () => {
  const route = createRoute({
    method: "get",
    path: "/search",
    request: {
      query: z.object({
        limit: z.coerce.number().int().min(1),
        q: z.string().min(1),
      }),
    },
    responses: { 200: jsonContent(z.object({ ok: z.literal(true) }), "ok") },
  });

  const app = createApp({
    logger: captureLogs().logger,
    webOrigin: WEB_ORIGIN,
  });
  const router = createRouter();
  router.openapi(route, (c) => c.json({ ok: true as const }, 200));
  app.route("/", router);

  it("answers VALIDATION_FAILED listing the field paths", async () => {
    const response = await app.request(`${BASE}/search?limit=0`);
    expect(response.status).toBe(422);
    const body = errorBodySchema.parse(await response.json());
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.fields?.toSorted()).toEqual(["limit", "q"]);
  });

  it("never echoes back what the caller sent", async () => {
    const response = await app.request(`${BASE}/search?q=&limit=SECRET-VALUE`);
    expect(JSON.stringify(await response.json())).not.toContain("SECRET-VALUE");
  });

  it("lets a valid request through", async () => {
    const response = await app.request(`${BASE}/search?q=a&limit=2`);
    expect(response.status).toBe(200);
  });
});

describe("browser access", () => {
  it("allows the platform app's origin, with credentials", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/healthz`, {
      headers: { origin: WEB_ORIGIN },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      WEB_ORIGIN
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true"
    );
  });

  it("does not allow any other origin", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/healthz`, {
      headers: { origin: "https://evil.example" },
    });
    expect(response.headers.get("access-control-allow-origin")).not.toBe(
      "https://evil.example"
    );
  });

  it("answers a preflight request", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/healthz`, {
      headers: {
        "access-control-request-headers": "content-type,if-match",
        "access-control-request-method": "PATCH",
        origin: WEB_ORIGIN,
      },
      method: "OPTIONS",
    });
    expect(response.status).toBeLessThan(300);
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "PATCH"
    );
  });

  it("sends security headers", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/healthz`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("the API documentation", () => {
  it("serves the OpenAPI document with the health routes", async () => {
    const { app } = setup();
    const response = await app.request(`${BASE}/openapi.json`);
    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths).toSorted()).toEqual([
      `${BASE}/healthz`,
      `${BASE}/readyz`,
    ]);
  });

  it("documents the real error body for the errors a route can return", async () => {
    const { app } = setup();
    const document = (await (
      await app.request(`${BASE}/openapi.json`)
    ).json()) as {
      paths: Record<string, { get: { responses: Record<string, unknown> } }>;
    };
    expect(
      Object.keys(
        document.paths[`${BASE}/readyz`]?.get.responses ?? {}
      ).toSorted()
    ).toEqual(["200", "500", "503"]);
  });

  it("serves the reference page when docs are on", async () => {
    const { app } = setup({ exposeDocs: true });
    const response = await app.request(`${BASE}/reference`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("serves neither the document nor the page in production", async () => {
    const { app } = setup({ exposeDocs: false });
    expect((await app.request(`${BASE}/openapi.json`)).status).toBe(404);
    expect((await app.request(`${BASE}/reference`)).status).toBe(404);
  });
});
