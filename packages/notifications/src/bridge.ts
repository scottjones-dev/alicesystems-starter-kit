import { Client } from "@novu/framework";
import { serve } from "@novu/framework/hono";
import { keys as base } from "@repo/env/base";
import type { Context } from "hono";
import type { NovuRegion } from "./client";
import { novuApiUrl } from "./client";
import { keys } from "./keys";
import { buildWorkflows } from "./workflows";

interface BridgeConfig {
  baseUrl: string;
  region: NovuRegion;
  /** Novu signs requests with this key. Without it the bridge answers 503. */
  secretKey?: string;
}

/**
 * The endpoint Novu calls to run our workflows. Mount it in the API under /api/novu.
 * Without a key it answers 503 instead of stopping the whole API from starting.
 */
export const createBridge = ({ baseUrl, region, secretKey }: BridgeConfig) => {
  if (!secretKey) {
    return (c: Context): Response =>
      c.json({ error: "Novu is not configured" }, 503);
  }
  return serve({
    client: new Client({
      apiUrl: novuApiUrl(region),
      secretKey,
      strictAuthentication: true,
    }),
    workflows: buildWorkflows(baseUrl),
  });
};

let handler: ReturnType<typeof createBridge> | null = null;

/** The bridge for the running app, built from the environment on the first request. */
export const bridge = async (c: Context): Promise<Response> => {
  if (!handler) {
    const { NOVU_REGION, NOVU_SECRET_KEY } = keys.env();
    handler = createBridge({
      baseUrl: base.env().WEB_ORIGIN,
      region: NOVU_REGION,
      secretKey: NOVU_SECRET_KEY,
    });
  }
  return await handler(c);
};
