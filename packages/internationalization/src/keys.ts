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
});
