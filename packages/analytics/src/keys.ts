import { defineKeys } from "@repo/env/define";
import { z } from "zod";

/*
 * The PostHog project key is public by design (it ships in the web and app bundles), so it is
 * not a secret, but it is still per environment. The data host is fixed to the EU in
 * options.ts, not configurable.
 */
export const keys = defineKeys({
  EXPO_PUBLIC_POSTHOG_TOKEN: {
    description:
      "Product analytics (optional): the PostHog project key for the native app. Leave empty to turn analytics off.",
    folder: "/native",
    hint: "https://eu.posthog.com (Project settings, starts with phc_)",
    schema: z.string().startsWith("phc_").optional(),
  },
  NEXT_PUBLIC_POSTHOG_TOKEN: {
    description:
      "Product analytics (optional): the PostHog project key for the website. Leave empty to turn analytics off.",
    folder: "/web",
    hint: "https://eu.posthog.com (Project settings, starts with phc_)",
    schema: z.string().startsWith("phc_").optional(),
  },
});
