import { randomUUID } from "node:crypto";

import { registry } from "@repo/emails/registry";
import { afterAll, describe, expect, it } from "vitest";

import { createNotify } from "./notify";
import { createLocalMailer, createSmtpTransport } from "./transports";

/*
 * Sends a real email to the Mailpit inbox (`pnpm infra:mailpit:up`) and reads it back from
 * Mailpit's API. Each run uses its own recipient address, finds only its own messages and
 * deletes only those, so it never touches whatever else is in your inbox.
 */

const SMTP_HOST = "localhost";
const SMTP_PORT = 1025;
const MAILPIT_API = "http://localhost:8025/api/v1";
const RETRY_DELAY_MS = 100;
const MAX_ATTEMPTS = 30;

interface MailpitMessage {
  From: { Address: string; Name: string };
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

const recipient = `test-${randomUUID()}@example.com`;
const sent: string[] = [];

const findMessages = async (): Promise<MailpitMessage[]> => {
  const response = await fetch(
    `${MAILPIT_API}/search?query=${encodeURIComponent(`to:${recipient}`)}`
  );
  const body = (await response.json()) as { messages: MailpitMessage[] };
  return body.messages;
};

const waitForMessages = async (count: number) => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: polling must wait for one attempt before the next
    const messages = await findMessages();
    if (messages.length >= count) {
      return messages;
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  throw new Error(
    `Mailpit did not receive ${count} message(s) for ${recipient}. Is it running?`
  );
};

afterAll(async () => {
  const messages = await findMessages();
  sent.push(...messages.map((message) => message.ID));
  if (sent.length > 0) {
    await fetch(`${MAILPIT_API}/messages`, {
      body: JSON.stringify({ IDs: sent }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
  }
});

describe("the smtp transport against Mailpit", () => {
  const {
    baseUrl: _baseUrl,
    locale: _locale,
    ...payload
  } = registry["reset-password"].previewProps;

  const notify = createNotify({
    log: (message, details) => {
      throw new Error(`${message}: ${JSON.stringify(details)}`);
    },
    transport: createSmtpTransport({
      baseUrl: "https://app.example.com",
      from: "no-reply@example.com",
      mailer: createLocalMailer(SMTP_HOST, SMTP_PORT),
    }),
  });

  it("delivers a real email, in the recipient's language, with the link in it", async () => {
    await notify("reset-password", {
      payload,
      to: { email: recipient, locale: "fr" },
    });
    const [message] = await waitForMessages(1);
    expect(message?.Subject).toBe("Réinitialisez votre mot de passe");
    expect(message?.To.map((to) => to.Address)).toEqual([recipient]);
    expect(message?.From.Address).toBe("no-reply@example.com");

    const detail = (await (
      await fetch(`${MAILPIT_API}/message/${message?.ID}`)
    ).json()) as {
      HTML: string;
      Text: string;
    };
    expect(detail.HTML).toContain(payload.url);
    expect(detail.HTML).toContain("https://app.example.com/privacy");
    expect(detail.Text).toContain(payload.url);
  });
});
