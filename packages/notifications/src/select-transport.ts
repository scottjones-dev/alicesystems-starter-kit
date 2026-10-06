import type { Novu } from "@novu/api";
import type { Transport } from "./transports";
import {
  createLocalMailer,
  createLogTransport,
  createNovuTransport,
  createSmtpTransport,
} from "./transports";

export interface TransportConfig {
  baseUrl: string;
  emailFrom?: string;
  isProduction: boolean;
  /** Null when there is no Novu key. */
  novu: Pick<Novu, "trigger"> | null;
  smtp?: { host?: string; port?: number };
  transport: "log" | "novu" | "smtp";
}

/**
 * Picks the transport from configuration, and refuses a combination that would silently
 * drop mail. It runs when the app starts, so a bad setup stops the process there with a clear
 * message, not when the first sign-up email goes nowhere.
 */
export const selectTransport = (config: TransportConfig): Transport => {
  if (config.isProduction && config.transport !== "novu") {
    throw new Error(
      `NOTIFICATIONS_TRANSPORT is "${config.transport}" in production; production sends through novu.`
    );
  }

  if (config.transport === "novu") {
    if (!config.novu) {
      throw new Error(
        'NOTIFICATIONS_TRANSPORT is "novu" but NOVU_SECRET_KEY is not set, so no email would ever be sent.'
      );
    }
    return createNovuTransport(config.novu);
  }

  if (config.transport === "smtp") {
    const { host, port } = config.smtp ?? {};
    if (!(host && port && config.emailFrom)) {
      throw new Error(
        'NOTIFICATIONS_TRANSPORT is "smtp" but SMTP_HOST, SMTP_PORT or EMAIL_FROM_ADDRESS is not set.'
      );
    }
    return createSmtpTransport({
      baseUrl: config.baseUrl,
      from: config.emailFrom,
      mailer: createLocalMailer(host, port),
    });
  }

  return createLogTransport();
};
