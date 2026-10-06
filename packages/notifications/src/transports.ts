import type { Novu } from "@novu/api";
import { app } from "@repo/config/app";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type { EventId, EventPayload } from "./events";
import { events } from "./events";

/*
 * A transport is how a notification actually leaves. notify() validates the data, then hands
 * it to one transport; swapping transports never changes a caller.
 *   novu  staging and production: Novu runs the workflow, renders through our bridge, delivers
 *   smtp  development: renders here and sends to the Mailpit inbox, no account needed
 *   log   tests: records what would have been sent
 */

export interface Recipient {
  /** Where the email goes. */
  email: string;
  /** The recipient's language, for example `de`. */
  locale?: string;
  phone?: string;
  /**
   * Who this is, for Novu's records: our user id. Leave out for someone without an account
   * (an invitee) and it is made from their address.
   */
  subscriberId?: string;
}

export interface SendInput<Id extends EventId> {
  eventId: Id;
  /** Pass the same key when retrying so the person is not notified twice. */
  idempotencyKey?: string;
  /** The recipient's language when we ship it, otherwise undefined (English). */
  locale?: string;
  payload: EventPayload<Id>;
  to: Recipient & { subscriberId: string };
}

export interface Transport {
  name: "log" | "novu" | "smtp";
  send: <Id extends EventId>(input: SendInput<Id>) => Promise<void>;
}

// --- smtp --------------------------------------------------------------------------------

export interface SmtpConfig {
  /** Web address of this environment: footer links in the email are built from it. */
  baseUrl: string;
  /** The address emails are sent from. The display name comes from @repo/config. */
  from: string;
  mailer: Pick<Transporter, "sendMail">;
}

export const createSmtpTransport = ({
  baseUrl,
  from,
  mailer,
}: SmtpConfig): Transport => ({
  name: "smtp",
  send: async ({ eventId, locale, payload, to }) => {
    const { html, subject, text } = await events[eventId].renderEmail(payload, {
      baseUrl,
      locale,
    });
    await mailer.sendMail({
      from: { address: from, name: app.email.fromName },
      html,
      replyTo: app.email.replyTo,
      subject,
      text,
      to: to.email,
    });
  },
});

/** A mailer for a plain SMTP server with no login and no TLS: Mailpit in development. */
export const createLocalMailer = (host: string, port: number) =>
  nodemailer.createTransport({ host, ignoreTLS: true, port, secure: false });

// --- novu --------------------------------------------------------------------------------

export const createNovuTransport = (
  client: Pick<Novu, "trigger">
): Transport => ({
  name: "novu",
  send: async ({ eventId, idempotencyKey, locale, payload, to }) => {
    await client.trigger({
      payload: locale ? { ...payload, locale } : payload,
      to: {
        email: to.email,
        locale: to.locale,
        phone: to.phone,
        subscriberId: to.subscriberId,
      },
      transactionId: idempotencyKey,
      workflowId: eventId,
    });
  },
});

// --- log ---------------------------------------------------------------------------------

export interface LoggedSend {
  eventId: EventId;
  locale?: string;
  to: string;
}

/** Records what would have been sent. For tests; sends nothing. */
export const createLogTransport = (): Transport & { sent: LoggedSend[] } => {
  const sent: LoggedSend[] = [];
  return {
    name: "log",
    send: ({ eventId, locale, to }) => {
      sent.push({ eventId, locale, to: to.email });
      return Promise.resolve();
    },
    sent,
  };
};
