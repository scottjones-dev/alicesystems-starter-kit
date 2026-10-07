import { defineKeys } from "@repo/env/define";
import { z } from "zod";

/*
 * Every setting here is optional: with none of them set, errors and logs stay on this machine
 * (standard output) and nothing is sent anywhere. Sentry's data region (EU) is chosen when the
 * Sentry organization is created; the DSN's host (ingest.de.sentry.io) then keeps it there.
 */

const SENTRY_ENVIRONMENT_BY_ENV = {
  dev: "development",
  prod: "production",
  staging: "staging",
  test: "test",
} as const;

const sentryEnvironment = (
  environment: keyof typeof SENTRY_ENVIRONMENT_BY_ENV
) => SENTRY_ENVIRONMENT_BY_ENV[environment];

/** One DSN setting per runtime, because each reads its own folder and public-variable prefix. */
const dsnKey = (runtime: string, folder: "/api" | "/native" | "/web") => ({
  description: `Error reporting (optional): the Sentry DSN for ${runtime}. Leave empty to turn error reporting off.`,
  folder,
  hint: "Sentry project settings, Client Keys (DSN). Use an EU organization: the host ends in .de.sentry.io",
  schema: z.url().optional(),
});

const environmentKey = (
  runtime: string,
  folder: "/api" | "/native" | "/web"
) => ({
  auto: sentryEnvironment,
  description: `The environment name Sentry shows for ${runtime} (development, staging, production), so staging errors are not mixed with production.`,
  folder,
  schema: z.string().min(1).optional(),
});

export const keys = defineKeys({
  BETTERSTACK_INGESTING_HOST: {
    description:
      "Log shipping (optional): the ingesting host of the Better Stack source, for example s123.eu-nbg-2.betterstackdata.com. Needs BETTERSTACK_SOURCE_TOKEN as well.",
    folder: "/api",
    hint: "Better Stack, Logs, Sources, your source (the host shown on the source's page)",
    schema: z
      .string()
      .regex(/^[a-z\d.-]+$/iu, "a host name without https://")
      .optional(),
  },
  BETTERSTACK_SOURCE_TOKEN: {
    description:
      "Log shipping (optional): the Better Stack source token. Leave empty to keep logs on standard output only.",
    folder: "/api",
    hint: "Better Stack, Logs, Sources, your source",
    schema: z.string().min(1).optional(),
  },
  BETTERSTACK_STATUS_URL: {
    description:
      "Status link (optional): the public Better Stack status page the website footer links to.",
    folder: "/web",
    hint: "Better Stack, Status pages",
    schema: z.url().optional(),
  },
  BETTERSTACK_UPTIME_TOKEN: {
    description:
      "Status indicator (optional): a Better Stack Uptime API token (read access) for the website footer's status dot.",
    folder: "/web",
    hint: "Better Stack, Uptime, Integrations, API tokens",
    schema: z.string().min(1).optional(),
  },
  EXPO_PUBLIC_SENTRY_DSN: dsnKey("the native app", "/native"),
  EXPO_PUBLIC_SENTRY_ENVIRONMENT: environmentKey("the native app", "/native"),
  NEXT_PUBLIC_SENTRY_DSN: dsnKey("the website and the platform", "/web"),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: environmentKey(
    "the website and the platform",
    "/web"
  ),
  SENTRY_AUTH_TOKEN: {
    description:
      "Source maps (optional, build time): lets the web build upload source maps to Sentry so stack traces show real code. Without it the build still works.",
    folder: "/web",
    hint: "Sentry, Settings, Developer Settings, Organization tokens",
    schema: z.string().min(1).optional(),
  },
  SENTRY_DSN: dsnKey("the API", "/api"),
  SENTRY_ENVIRONMENT: environmentKey("the API", "/api"),
  SENTRY_ORG: {
    description:
      "Source maps (optional, build time): the Sentry organization slug.",
    folder: "/web",
    schema: z.string().min(1).optional(),
  },
  SENTRY_PROJECT: {
    description:
      "Source maps (optional, build time): the Sentry project slug for the web apps.",
    folder: "/web",
    schema: z.string().min(1).optional(),
  },
  SENTRY_RELEASE: {
    description:
      "The version Sentry tags API errors with, usually the git commit SHA, set by the deploy. Leave empty to send none.",
    folder: "/api",
    schema: z.string().min(1).optional(),
  },
});
