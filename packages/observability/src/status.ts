import { z } from "zod";

/*
 * The uptime status the website footer shows, read from Better Stack Uptime. This file has no
 * markup: the app renders `ServiceStatus` with its own components and theme.
 */

export const SERVICE_STATES = [
  "normal",
  "partial",
  "degraded",
  "unknown",
] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];

export interface ServiceStatus {
  state: ServiceState;
  /** The public status page, when one is configured. */
  url?: string;
}

const UPTIME_MONITORS_URL = "https://uptime.betterstack.com/api/v2/monitors";
const REQUEST_TIMEOUT_MS = 3000;

/** Only what we read of Better Stack's response; the rest is ignored. */
const monitorsResponseSchema = z.object({
  data: z.array(z.object({ attributes: z.object({ status: z.string() }) })),
});

/** Monitors that say nothing about whether the service is working. */
const IGNORED_STATUSES = new Set(["paused", "pending", "validating"]);
/** A planned maintenance window is not an outage. */
const WORKING_STATUSES = new Set(["up", "maintenance"]);

/**
 * All monitors working is `normal`, none is `degraded`, anything between is `partial`.
 * Paused and not-yet-checked monitors are ignored; with nothing left the state is `unknown`.
 */
export const summarizeStatuses = (
  statuses: readonly string[]
): ServiceState => {
  const counted = statuses.filter((status) => !IGNORED_STATUSES.has(status));
  if (counted.length === 0) {
    return "unknown";
  }
  const working = counted.filter((status) =>
    WORKING_STATUSES.has(status)
  ).length;
  if (working === counted.length) {
    return "normal";
  }
  return working === 0 ? "degraded" : "partial";
};

export interface ServiceStatusOptions {
  fetch?: typeof fetch;
  /** Extra request options, such as Next.js's `{ next: { revalidate: 60 } }` cache hint. */
  requestInit?: RequestInit;
  /** The public status page to link to. */
  statusUrl?: string;
  /** A Better Stack Uptime API token (read access). Without one there is no status. */
  token?: string;
}

/**
 * Asks Better Stack for the monitors and summarises them. Returns `null` when no token is set
 * (show nothing), and `unknown` when the request fails: a status check must never break a page.
 */
export const getServiceStatus = async ({
  fetch: send = globalThis.fetch,
  requestInit,
  statusUrl,
  token,
}: ServiceStatusOptions): Promise<ServiceStatus | null> => {
  if (!token) {
    return null;
  }
  try {
    const response = await send(UPTIME_MONITORS_URL, {
      ...requestInit,
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { state: "unknown", url: statusUrl };
    }
    const { data } = monitorsResponseSchema.parse(await response.json());
    return {
      state: summarizeStatuses(
        data.map((monitor) => monitor.attributes.status)
      ),
      url: statusUrl,
    };
  } catch {
    return { state: "unknown", url: statusUrl };
  }
};
