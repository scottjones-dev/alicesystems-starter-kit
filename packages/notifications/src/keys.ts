import { defineKeys } from "@repo/env/define";
import { z } from "zod";

const devOnly = (value: string) => (environment: string) =>
  environment === "dev" ? value : undefined;

export const keys = defineKeys({
  EMAIL_FROM_ADDRESS: {
    auto: devOnly("no-reply@example.com"),
    description:
      "The address emails are sent from, for the smtp transport. With Novu the sender is set on the email integration in Novu's dashboard.",
    folder: "/api",
    hint: "An address on a domain you control and have verified with your email provider",
    schema: z.email().optional(),
  },
  NOTIFICATIONS_TRANSPORT: {
    auto: (environment) => (environment === "dev" ? "smtp" : "novu"),
    description:
      "How notify() delivers: novu (staging and production), smtp (development: sends to the Mailpit inbox) or log (tests). Production only accepts novu.",
    folder: "/api",
    schema: z.enum(["novu", "smtp", "log"]),
  },
  NOVU_REGION: {
    auto: () => "eu",
    description:
      "Region of your Novu account. A key from one region is rejected by the other with 'API Key not found'.",
    folder: "/api",
    schema: z.enum(["eu", "us"]).default("eu"),
  },
  NOVU_SECRET_KEY: {
    description:
      "Novu secret key. Required when NOTIFICATIONS_TRANSPORT is novu; also used by the bridge that Novu calls.",
    folder: "/api",
    hint: "https://dashboard.novu.co/api-keys (use the dashboard of your region)",
    requiredIn: ["test", "staging", "prod"],
    schema: z.string().min(1).optional(),
  },
  SMTP_HOST: {
    auto: devOnly("localhost"),
    description:
      "Host of the plain SMTP server for the smtp transport (Mailpit in development).",
    folder: "/api",
    schema: z.string().min(1).optional(),
  },
  SMTP_PORT: {
    auto: devOnly("1025"),
    description: "Port of that SMTP server (Mailpit listens on 1025).",
    folder: "/api",
    schema: z.coerce.number().int().positive().optional(),
  },
});
