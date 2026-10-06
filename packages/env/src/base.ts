import { z } from "zod";

import { createServerEnv } from "./create-env";

/** The keys every runtime has. Feature packages declare their own keys next to their code. */
export const keys = () =>
  createServerEnv({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  });

export const env = keys();
