interface ShutdownDeps {
  closeDatabase: () => Promise<void>;
  closeServer: () => Promise<void>;
  exit: (code: number) => void;
  log: (message: string) => void;
  /** How long to wait before giving up and exiting anyway, so a deploy is never held up. */
  timeoutMs: number;
}

/**
 * Builds the function that runs on SIGTERM or SIGINT: stop taking requests, let the ones in
 * flight finish, close the database, exit. If that takes longer than `timeoutMs` it exits
 * with an error instead. Calling it twice does nothing the second time.
 */
export const createShutdown = ({
  closeDatabase,
  closeServer,
  exit,
  log,
  timeoutMs,
}: ShutdownDeps) => {
  let started = false;

  return async (signal: string): Promise<void> => {
    if (started) {
      return;
    }
    started = true;
    log(`${signal} received, shutting down`);

    const timer = setTimeout(() => {
      log("shutdown took too long, exiting");
      exit(1);
    }, timeoutMs);
    // The timer must not keep the process alive on its own.
    timer.unref();

    try {
      await closeServer();
      await closeDatabase();
      clearTimeout(timer);
      exit(0);
    } catch (error) {
      clearTimeout(timer);
      log(
        `shutdown failed: ${error instanceof Error ? error.name : "unknown"}`
      );
      exit(1);
    }
  };
};
