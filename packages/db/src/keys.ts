import { defineKeys } from "@repo/env/define";
import { z } from "zod";

export const keys = defineKeys({
  DATABASE_URL: {
    description:
      "Postgres connection string: postgres://USER:PASSWORD@HOST:PORT/DB",
    folder: "/api",
    hint: "Neon, Supabase or RDS connection string. Locally: `pnpm infra:postgres:up`.",
    local: "postgres://postgres:postgres@localhost:5432/starterkit",
    schema: z.url(),
  },
});
