import type { Scrubber } from "./scrub";
import { defaultScrubber } from "./scrub";

/*
 * Structured logs: one JSON object per line, with the same privacy rules as Sentry. A line is
 * always written to standard output (where a host such as CloudWatch collects it) and, when a
 * shipper is given, also sent to Better Stack. Nothing here can throw into the caller: a log
 * line must never be the reason a request fails.
 */

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** A log line as written and shipped. Extra fields sit beside these. */
export interface LogRecord {
  level: LogLevel;
  msg: string;
  service: string;
  time: string;
  [field: string]: unknown;
}

/** Where records go besides standard output. `flush` sends what is buffered. */
export interface LogShipper {
  flush: () => Promise<void>;
  push: (record: LogRecord) => void;
}

export interface LoggerOptions {
  /**
   * Include an error's message in the log. Off in production: a database error can quote the
   * row it failed on, so only the error's name is logged there.
   */
  exposeErrorMessages?: boolean;
  /** The lowest level that is written. Defaults to `info`. */
  level?: LogLevel;
  now?: () => Date;
  scrubber?: Scrubber;
  /** Which part of the system writes these lines, e.g. `api`. */
  service: string;
  shipper?: LogShipper;
  /** Where lines go. Defaults to standard output. */
  write?: (line: string) => void;
}

export interface Logger {
  child: (fields: Record<string, unknown>) => Logger;
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  /** Sends what the shipper has buffered. Call it on shutdown. */
  flush: () => Promise<void>;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
}

const writeToStdout = (line: string) => {
  process.stdout.write(`${line}\n`);
};

const rank = (level: LogLevel) => LOG_LEVELS.indexOf(level);

/** Errors do not serialise to JSON usefully, so they become `{ name, message? }`. */
const describeError = (error: Error, exposeMessage: boolean) =>
  exposeMessage
    ? { message: error.message, name: error.name }
    : { name: error.name };

export const createLogger = ({
  exposeErrorMessages = false,
  level: minimumLevel = "info",
  now = () => new Date(),
  scrubber = defaultScrubber,
  service,
  shipper,
  write = writeToStdout,
}: LoggerOptions): Logger => {
  const build = (bound: Record<string, unknown>): Logger => {
    const log = (
      level: LogLevel,
      msg: string,
      fields: Record<string, unknown> = {}
    ) => {
      if (rank(level) < rank(minimumLevel)) {
        return;
      }
      try {
        const merged = Object.fromEntries(
          Object.entries({ ...bound, ...fields }).map(([key, value]) => [
            key,
            value instanceof Error
              ? describeError(value, exposeErrorMessages)
              : value,
          ])
        );
        const record: LogRecord = {
          // Written last so a field named `level` or `msg` cannot overwrite the real ones.
          ...(scrubber.scrubValue(merged) as Record<string, unknown>),
          level,
          msg: scrubber.scrubText(msg),
          service,
          time: now().toISOString(),
        };
        write(JSON.stringify(record));
        shipper?.push(record);
      } catch {
        // Logging must never throw into the caller.
      }
    };

    return {
      child: (fields) => build({ ...bound, ...fields }),
      debug: (msg, fields) => log("debug", msg, fields),
      error: (msg, fields) => log("error", msg, fields),
      flush: async () => {
        try {
          await shipper?.flush();
        } catch {
          // A failed send is dropped (see the shipper); never fail shutdown over logs.
        }
      },
      info: (msg, fields) => log("info", msg, fields),
      warn: (msg, fields) => log("warn", msg, fields),
    };
  };

  return build({});
};

export interface BetterStackShipperOptions {
  /** Lines per request. A full batch is sent at once. */
  batchSize?: number;
  fetch?: typeof fetch;
  /** How long a record waits for company before being sent anyway. */
  flushIntervalMs?: number;
  /** The source's ingesting host, without `https://`. */
  ingestingHost: string;
  /** Called with the number of records dropped when a send fails, so it can be noted. */
  onDropped?: (count: number) => void;
  sourceToken: string;
}

/** Node's timers can be unref'd; browsers' cannot, and the types allow either. */
const unref = (handle: unknown) => {
  if (
    typeof handle === "object" &&
    handle !== null &&
    "unref" in handle &&
    typeof handle.unref === "function"
  ) {
    handle.unref();
  }
};

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL_MS = 2000;
/** Give up on a send that hangs, so shutdown is not held up by a slow log service. */
const SEND_TIMEOUT_MS = 5000;
/** Stop buffering past this many records if sends keep failing, so memory cannot grow forever. */
const MAX_BUFFERED = 1000;

/**
 * Sends records to Better Stack's HTTP ingestion API in batches (a JSON array per request,
 * authenticated with the source token). A failed send drops that batch instead of retrying:
 * logs are best effort, and standard output already has every line.
 */
export const createBetterStackShipper = ({
  batchSize = DEFAULT_BATCH_SIZE,
  fetch: send = globalThis.fetch,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
  ingestingHost,
  onDropped,
  sourceToken,
}: BetterStackShipperOptions): LogShipper => {
  let buffer: LogRecord[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (buffer.length === 0) {
      return;
    }
    const batch = buffer;
    buffer = [];
    try {
      const response = await send(`https://${ingestingHost}`, {
        body: JSON.stringify(
          // Better Stack reads `dt` as the time and `message` as the text of the line.
          batch.map(({ msg, time, ...rest }) => ({
            dt: time,
            message: msg,
            ...rest,
          }))
        ),
        headers: {
          Authorization: `Bearer ${sourceToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) {
        onDropped?.(batch.length);
      }
    } catch {
      onDropped?.(batch.length);
    }
  };

  return {
    flush,
    push: (record) => {
      if (buffer.length >= MAX_BUFFERED) {
        onDropped?.(1);
        return;
      }
      buffer.push(record);
      if (buffer.length >= batchSize) {
        flush();
        return;
      }
      if (!timer) {
        timer = setTimeout(flush, flushIntervalMs);
        // A waiting batch must not keep the process alive on its own.
        unref(timer);
      }
    },
  };
};
