import { defineKeys } from "@repo/env/define";
import { z } from "zod";

export const keys = defineKeys({
  JOBS_WORKER: {
    auto: () => "true",
    description:
      "Whether this process runs background jobs. true (the default): run them inside this process. false: only queue them, and let a separate worker process run them.",
    folder: "/api",
    schema: z.enum(["true", "false"]).default("true"),
  },
});
