import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createShutdown } from "./shutdown";

const TIMEOUT_MS = 1000;

const setup = (
  overrides: {
    closeDatabase?: () => Promise<void>;
    closeServer?: () => Promise<void>;
  } = {}
) => {
  const order: string[] = [];
  const exit = vi.fn<(code: number) => void>();
  const log = vi.fn<(message: string) => void>();
  const shutdown = createShutdown({
    closeDatabase:
      overrides.closeDatabase ??
      (() => {
        order.push("database");
        return Promise.resolve();
      }),
    closeServer:
      overrides.closeServer ??
      (() => {
        order.push("server");
        return Promise.resolve();
      }),
    exit,
    flushObservability: () => {
      order.push("flush");
      return Promise.resolve();
    },
    log,
    stopJobs: () => {
      order.push("jobs");
      return Promise.resolve();
    },
    timeoutMs: TIMEOUT_MS,
  });
  return { exit, log, order, shutdown };
};

describe("createShutdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops the server before the database, then exits cleanly", async () => {
    const { exit, order, shutdown } = setup();
    await shutdown("SIGTERM");
    expect(order).toEqual(["server", "jobs", "database", "flush"]);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it("still sends the last logs and errors when closing fails", async () => {
    const { exit, order, shutdown } = setup({
      closeDatabase: () => Promise.reject(new Error("pool stuck")),
    });
    await shutdown("SIGTERM");
    expect(order).toEqual(["server", "jobs", "flush"]);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("lets running jobs finish before the database they use is closed", async () => {
    const { order, shutdown } = setup();
    await shutdown("SIGTERM");
    expect(order.indexOf("jobs")).toBeLessThan(order.indexOf("database"));
  });

  it("exits with an error when closing fails", async () => {
    const { exit, shutdown } = setup({
      closeDatabase: () => Promise.reject(new Error("pool stuck")),
    });
    await shutdown("SIGTERM");
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("does nothing the second time", async () => {
    const { exit, order, shutdown } = setup();
    await shutdown("SIGTERM");
    await shutdown("SIGINT");
    expect(order).toEqual(["server", "jobs", "database", "flush"]);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("gives up and exits with an error if closing takes too long", async () => {
    const { exit, log, shutdown } = setup({
      closeServer: () => new Promise(() => undefined),
    });
    const pending = shutdown("SIGTERM");
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(log).toHaveBeenCalledWith("shutdown took too long, exiting");
    // The promise from the stuck close is left pending on purpose; the process is exiting.
    expect(pending).toBeInstanceOf(Promise);
  });

  it("names the signal in the log", async () => {
    const { log, shutdown } = setup();
    await shutdown("SIGINT");
    expect(log).toHaveBeenCalledWith("SIGINT received, shutting down");
  });
});
