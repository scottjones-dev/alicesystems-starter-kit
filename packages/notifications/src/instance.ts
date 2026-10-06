import { keys as base } from "@repo/env/base";

import { createNovuClient } from "./client";
import { keys } from "./keys";
import { createNotify } from "./notify";
import { selectTransport } from "./select-transport";

/*
 * The notify() the app uses. This is the one place that reads the environment to build it.
 * It runs when the module is first imported, so a bad setup (production without a Novu key)
 * stops the process at startup with a clear message.
 *
 * @example
 * void notify("magic-link", {
 *   to: { email: user.email, locale: user.locale, subscriberId: user.id },
 *   payload: { expiresIn: { minutes: 15 }, url },
 * });
 */

const env = keys.env();
const { NODE_ENV: nodeEnv, WEB_ORIGIN: baseUrl } = base.env();

export const notify = createNotify({
  log: (message, details) =>
    console.warn(`[notifications] ${message}`, details),
  transport: selectTransport({
    baseUrl,
    emailFrom: env.EMAIL_FROM_ADDRESS,
    isProduction: nodeEnv === "production",
    novu: createNovuClient(env.NOVU_SECRET_KEY, env.NOVU_REGION),
    smtp: { host: env.SMTP_HOST, port: env.SMTP_PORT },
    transport: env.NOTIFICATIONS_TRANSPORT,
  }),
});
