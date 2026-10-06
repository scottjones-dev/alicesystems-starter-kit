import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { createBridge } from "./bridge";

describe("the bridge", () => {
  it("answers 503 instead of crashing when there is no Novu key", async () => {
    const app = new Hono().all(
      "/novu",
      createBridge({ baseUrl: "https://example.com", region: "eu" })
    );
    const response = await app.request("/novu");
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Novu is not configured",
    });
  });

  it("answers Novu's health check when a key is set", async () => {
    const app = new Hono().all(
      "/novu",
      createBridge({
        baseUrl: "https://example.com",
        region: "eu",
        secretKey: "test-key",
      })
    );
    const response = await app.request("/novu?action=health-check");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      discovered: { workflows: number };
    };
    expect(body.status).toBe("ok");
    expect(body.discovered.workflows).toBe(5);
  });
});
