import { defineKeys } from "@repo/env/define";
import { z } from "zod";

const DEFAULT_PORT = 9000;

export const keys = defineKeys({
  PORT: {
    auto: () => String(DEFAULT_PORT),
    description:
      "Port the API listens on. The web apps reach it at this port in development.",
    folder: "/api",
    schema: z.coerce.number().int().positive().default(DEFAULT_PORT),
  },
});
