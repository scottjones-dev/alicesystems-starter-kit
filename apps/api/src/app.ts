import { app as appConfig } from "@repo/config/app";
import { Scalar } from "@scalar/hono-api-reference";
import type { AppShellOptions } from "./lib/create-app";
import { createApp } from "./lib/create-app";
import { createHealthRouter } from "./routes/health";

const API_VERSION = "0.1.0";

export interface BuildAppOptions extends AppShellOptions {
  checkDatabase: () => Promise<void>;
  /**
   * Serves the OpenAPI document and its reference page. On in development, off in production,
   * so the shape of the API is not advertised to the whole internet.
   */
  exposeDocs: boolean;
}

/**
 * The API: the app shell with every feature mounted on it. Everything it needs from the
 * outside comes in as an option, so tests build it with fakes and `index.ts` with the real
 * database and environment.
 */
export const buildApp = ({
  checkDatabase,
  exposeDocs,
  ...shell
}: BuildAppOptions) => {
  const app = createApp(shell);

  app.route("/", createHealthRouter({ checkDatabase }));

  if (exposeDocs) {
    const documentPath = `${appConfig.api.basePath}/openapi.json`;
    app.doc("/openapi.json", {
      info: { title: `${appConfig.name} API`, version: API_VERSION },
      openapi: "3.1.0",
    });
    app.get("/reference", Scalar({ url: documentPath }));
  }

  return app;
};
