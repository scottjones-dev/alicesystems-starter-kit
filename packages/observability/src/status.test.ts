import { describe, expect, it, vi } from "vitest";

import { getServiceStatus, summarizeStatuses } from "./status";

const monitors = (...statuses: string[]) =>
  new Response(
    JSON.stringify({
      data: statuses.map((status) => ({ attributes: { status }, id: "1" })),
    }),
    { status: 200 }
  );

describe("summarizeStatuses", () => {
  it("is normal when every monitor is up", () => {
    expect(summarizeStatuses(["up", "up"])).toBe("normal");
  });

  it("is degraded when none is up", () => {
    expect(summarizeStatuses(["down", "down"])).toBe("degraded");
  });

  it("is partial when some are up", () => {
    expect(summarizeStatuses(["up", "down"])).toBe("partial");
  });

  it("does not count planned maintenance as an outage", () => {
    expect(summarizeStatuses(["up", "maintenance"])).toBe("normal");
  });

  it("ignores paused and not-yet-checked monitors", () => {
    expect(summarizeStatuses(["up", "paused", "pending", "validating"])).toBe(
      "normal"
    );
  });

  it("is unknown when there is nothing to judge", () => {
    expect(summarizeStatuses([])).toBe("unknown");
    expect(summarizeStatuses(["paused"])).toBe("unknown");
  });
});

describe("getServiceStatus", () => {
  it("shows nothing without a token and does not call out", async () => {
    const send = vi.fn();

    await expect(getServiceStatus({ fetch: send })).resolves.toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it("asks Better Stack Uptime with the token and summarises the monitors", async () => {
    const send = vi.fn(async () => monitors("up", "down"));

    const status = await getServiceStatus({
      fetch: send,
      requestInit: { cache: "no-store" },
      statusUrl: "https://status.example.test",
      token: "tok",
    });

    expect(status).toStrictEqual({
      state: "partial",
      url: "https://status.example.test",
    });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://uptime.betterstack.com/api/v2/monitors");
    expect(init.headers).toStrictEqual({ Authorization: "Bearer tok" });
    expect(init.cache).toBe("no-store");
  });

  it("is unknown, not an error, when the request fails or is refused", async () => {
    const refused = await getServiceStatus({
      fetch: async () => new Response(null, { status: 401 }),
      token: "tok",
    });
    const offline = await getServiceStatus({
      fetch: () => Promise.reject(new Error("offline")),
      token: "tok",
    });

    expect(refused).toStrictEqual({ state: "unknown", url: undefined });
    expect(offline).toStrictEqual({ state: "unknown", url: undefined });
  });

  it("is unknown when the response is not what we expect", async () => {
    const status = await getServiceStatus({
      fetch: async () => Response.json({ data: "nope" }),
      token: "tok",
    });

    expect(status?.state).toBe("unknown");
  });
});
