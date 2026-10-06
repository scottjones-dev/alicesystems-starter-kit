import { defineKeys } from "@repo/env/define";
import { z } from "zod";

export const keys = defineKeys({
  LANGUINE_API_KEY: {
    description:
      "Translation tooling (optional): API key for `pnpm translate`. Only needed by whoever translates new text.",
    folder: "/internationalization",
    hint: "https://languine.ai",
    schema: z.string().min(1).optional(),
  },
  LANGUINE_PROJECT_ID: {
    description:
      "Translation tooling (optional): Languine project ID for `pnpm translate`. Kept in env, not languine.json, so it stays out of git.",
    folder: "/internationalization",
    hint: "https://languine.ai (project settings, starts with prj_)",
    schema: z.string().min(1).optional(),
  },
});
