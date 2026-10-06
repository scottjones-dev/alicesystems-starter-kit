import { loadRootEnv } from "@repo/env/load";
import { defineConfig } from "drizzle-kit";

import { keys } from "./src/keys";

// Database commands read the root .env (from `pnpm setup:local` or `pnpm env:pull`).
// Variables already set in the shell, as in CI, win over the file.
loadRootEnv();

export default defineConfig({
  dbCredentials: { url: keys.env().DATABASE_URL },
  dialect: "postgresql",
  out: "./migrations",
  schema: "./src/schemas",
});
