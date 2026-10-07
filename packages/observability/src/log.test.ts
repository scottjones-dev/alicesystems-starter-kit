import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LogRecord } from "./log";
import { createBetterStackShipper, createLogger } from "./log";
import { createScrubber } from "./scrub";

const FIXED_TIME = new Date("2026-01-02T03:04:05.000Z");
const now = () => FIXED_TIME;

const collect = () => {
  const lines: string[] = [];
  return {
    lines,
    parsed: () => lines.map((line) => JSON.parse(line) as LogRecord),
    write: (line: string) => lines.push(line),
  };
};

describe("createLogger", () => {
  it("writes one JSON object per line with level, message, service and time", () => {
    const out = collect();
    const log = createLogger({ now, service: "api", write: out.write });

    log.info("request", { requestId: "r1", status: 200 });

    expect(out.parsed()).toStrictEqual([
      {
        level: "info",
        msg: "request",
        requestId: "r1",
        service: "api",
        status: 200,
        time: "2026-01-02T03:04:05.000Z",
      },
    ]);
  });

  it("skips lines below the minimum level", () => {
    const out = collect();
    const log = createLogger({
      level: "warn",
      now,
      service: "api",
      write: out.write,
    });

    log.debug("a");
    log.info("b");
    log.warn("c");
    log.error("d");

    expect(out.parsed().map((record) => record.msg)).toStrictEqual(["c", "d"]);
  });

  it("scrubs sensitive fields and emails in messages", () => {
    const out = collect();
    const log = createLogger({ now, service: "api", write: out.write });

    log.info("sent to a@b.test", { password: "hunter2", route: "/x" });

    expect(out.parsed()[0]).toMatchObject({
      msg: "sent to [Filtered]",
      password: "[Filtered]",
      route: "/x",
    });
  });

  it("uses the scrubber it is given, so a platform's own words are hidden", () => {
    const out = collect();
    const log = createLogger({
      now,
      scrubber: createScrubber({ extraKeys: ["note"] }),
      service: "api",
      write: out.write,
    });

    log.info("saved", { note: "private" });

    expect(out.parsed()[0]?.note).toBe("[Filtered]");
  });

  it("logs an error's name, and its message only when allowed", () => {
    const hidden = collect();
    const shown = collect();
    const error = new TypeError("duplicate key (a@b.test)");

    createLogger({ now, service: "api", write: hidden.write }).error("failed", {
      error,
    });
    createLogger({
      exposeErrorMessages: true,
      now,
      service: "api",
      write: shown.write,
    }).error("failed", { error });

    expect(hidden.parsed()[0]?.error).toStrictEqual({ name: "TypeError" });
    expect(shown.parsed()[0]?.error).toStrictEqual({
      message: "duplicate key ([Filtered])",
      name: "TypeError",
    });
  });

  it("lets a child logger carry fields such as the request id", () => {
    const out = collect();
    const log = createLogger({ now, service: "api", write: out.write }).child({
      requestId: "r1",
    });

    log.info("a");
    log.info("b", { extra: 1 });

    expect(out.parsed().map((record) => record.requestId)).toStrictEqual([
      "r1",
      "r1",
    ]);
  });

  it("does not let a field overwrite the real level or message", () => {
    const out = collect();
    const log = createLogger({ now, service: "api", write: out.write });

    log.warn("real", { level: "debug", msg: "fake", service: "other" });

    expect(out.parsed()[0]).toMatchObject({
      level: "warn",
      msg: "real",
      service: "api",
    });
  });

  it("never throws into the caller, even when writing fails", () => {
    const log = createLogger({
      service: "api",
      write: () => {
        throw new Error("disk full");
      },
    });

    expect(() => log.error("x")).not.toThrow();
  });

  it("hands every line to the shipper and flushes it on request", async () => {
    const out = collect();
    const pushed: LogRecord[] = [];
    const flush = vi.fn(async () => undefined);
    const log = createLogger({
      now,
      service: "api",
      shipper: { flush, push: (record) => pushed.push(record) },
      write: out.write,
    });

    log.info("a");
    await log.flush();

    expect(pushed).toHaveLength(1);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("does not fail shutdown when the shipper's flush fails", async () => {
    const log = createLogger({
      service: "api",
      shipper: {
        flush: () => Promise.reject(new Error("down")),
        push: () => undefined,
      },
      write: () => undefined,
    });

    await expect(log.flush()).resolves.toBeUndefined();
  });
});

describe("createBetterStackShipper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const record = (msg: string): LogRecord => ({
    level: "info",
    msg,
    service: "api",
    time: "2026-01-02T03:04:05.000Z",
  });

  it("sends a batch as a JSON array to the host with the source token", async () => {
    const send = vi.fn(async () => new Response(null, { status: 202 }));
    const shipper = createBetterStackShipper({
      fetch: send,
      ingestingHost: "s1.eu-nbg-2.betterstackdata.com",
      sourceToken: "tok",
    });

    shipper.push({ ...record("a"), requestId: "r1" });
    shipper.push(record("b"));
    await shipper.flush();

    expect(send).toHaveBeenCalledTimes(1);
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://s1.eu-nbg-2.betterstackdata.com");
    expect(init.method).toBe("POST");
    expect(init.headers).toStrictEqual({
      Authorization: "Bearer tok",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string)).toStrictEqual([
      {
        dt: "2026-01-02T03:04:05.000Z",
        level: "info",
        message: "a",
        requestId: "r1",
        service: "api",
      },
      {
        dt: "2026-01-02T03:04:05.000Z",
        level: "info",
        message: "b",
        service: "api",
      },
    ]);
  });

  it("sends by itself once a batch is full", () => {
    const send = vi.fn(async () => new Response(null, { status: 202 }));
    const shipper = createBetterStackShipper({
      batchSize: 2,
      fetch: send,
      ingestingHost: "h",
      sourceToken: "tok",
    });

    shipper.push(record("a"));
    expect(send).not.toHaveBeenCalled();
    shipper.push(record("b"));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends a waiting record after the flush interval", async () => {
    const send = vi.fn(async () => new Response(null, { status: 202 }));
    const shipper = createBetterStackShipper({
      fetch: send,
      flushIntervalMs: 1000,
      ingestingHost: "h",
      sourceToken: "tok",
    });

    shipper.push(record("a"));
    await vi.advanceTimersByTimeAsync(999);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends nothing when nothing is waiting", async () => {
    const send = vi.fn();
    const shipper = createBetterStackShipper({
      fetch: send,
      ingestingHost: "h",
      sourceToken: "tok",
    });

    await shipper.flush();

    expect(send).not.toHaveBeenCalled();
  });

  it("drops a batch whose send fails or is refused, and reports the count", async () => {
    const onDropped = vi.fn();
    const refused = createBetterStackShipper({
      fetch: async () => new Response(null, { status: 401 }),
      ingestingHost: "h",
      onDropped,
      sourceToken: "bad",
    });
    const broken = createBetterStackShipper({
      fetch: () => Promise.reject(new Error("offline")),
      ingestingHost: "h",
      onDropped,
      sourceToken: "tok",
    });

    refused.push(record("a"));
    await expect(refused.flush()).resolves.toBeUndefined();
    broken.push(record("b"));
    broken.push(record("c"));
    await expect(broken.flush()).resolves.toBeUndefined();

    expect(onDropped.mock.calls).toStrictEqual([[1], [2]]);
  });

  it("stops buffering when sends never succeed, so memory cannot grow forever", () => {
    const onDropped = vi.fn();
    const shipper = createBetterStackShipper({
      batchSize: 10_000,
      fetch: vi.fn(),
      ingestingHost: "h",
      onDropped,
      sourceToken: "tok",
    });

    for (let index = 0; index < 1100; index += 1) {
      shipper.push(record(String(index)));
    }

    expect(onDropped).toHaveBeenCalledTimes(100);
  });
});
