import { z } from "zod";

import { defineKeys } from "./define";

/** The keys every runtime has. Feature packages define their own keys next to their code. */
export const keys = defineKeys({
  NODE_ENV: {
    auto: (environment) =>
      environment === "dev" ? "development" : "production",
    description: "development | test | production. Defaults to development.",
    folder: "/api",
    schema: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  SKIP_ENV_VALIDATION: {
    description:
      "Set to 1 to skip validation, for CI builds that have no secrets. Never in production.",
    folder: "/api",
    schema: z.string().optional(),
  },
  WEB_ORIGIN: {
    auto: (environment) =>
      environment === "dev" ? "http://localhost:3000" : undefined,
    description:
      "Origin of the web app (scheme and host, no path). Emails build their links from it; auth allows it for sign-in redirects and passkeys.",
    folder: "/api",
    hint: "The deployed web URL (https://...)",
    schema: z.url(),
  },
});
