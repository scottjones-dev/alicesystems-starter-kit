import { app } from "@repo/config/app";
import { registry } from "@repo/emails/registry";
import { describe, expect, it, vi } from "vitest";

import {
  createLogTransport,
  createNovuTransport,
  createSmtpTransport,
} from "./transports";

const BASE_URL = "https://staging.example.com";

const magicLinkPayload = (() => {
  const {
    baseUrl: _baseUrl,
    locale: _locale,
    ...rest
  } = registry["magic-link"].previewProps;
  return rest;
})();

describe("the smtp transport", () => {
  const setup = () => {
    const sendMail = vi
      .fn<(message: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue();
    // SAFETY: the transport only calls sendMail.
    const mailer = { sendMail } as never;
    return {
      send: createSmtpTransport({
        baseUrl: BASE_URL,
        from: "no-reply@example.com",
        mailer,
      }).send,
      sendMail,
    };
  };

  it("renders the email and sends it from the configured address", async () => {
    const { send, sendMail } = setup();
    await send({
      eventId: "magic-link",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", subscriberId: "user_1" },
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]?.[0] ?? {};
    expect(message).toMatchObject({
      from: { address: "no-reply@example.com", name: app.email.fromName },
      replyTo: app.email.replyTo,
      subject: "Your sign-in link",
      to: "ada@example.com",
    });
    expect(String(message.html)).toContain(magicLinkPayload.url);
    expect(String(message.text)).toContain(magicLinkPayload.url);
  });

  it("builds footer links from the environment's address", async () => {
    const { send, sendMail } = setup();
    await send({
      eventId: "magic-link",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", subscriberId: "user_1" },
    });
    expect(String(sendMail.mock.calls[0]?.[0]?.html)).toContain(
      `${BASE_URL}${app.links.privacy}`
    );
  });

  it("writes the email in the recipient's language", async () => {
    const { send, sendMail } = setup();
    await send({
      eventId: "magic-link",
      locale: "es",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", subscriberId: "user_1" },
    });
    expect(sendMail.mock.calls[0]?.[0]?.subject).toBe(
      "Tu enlace para iniciar sesión"
    );
  });

  it("lets a sending failure reach notify(), which logs it", async () => {
    const { send, sendMail } = setup();
    sendMail.mockRejectedValue(new Error("connection refused"));
    await expect(
      send({
        eventId: "magic-link",
        payload: magicLinkPayload,
        to: { email: "ada@example.com", subscriberId: "user_1" },
      })
    ).rejects.toThrow("connection refused");
  });
});

describe("the novu transport", () => {
  const setup = () => {
    const trigger = vi
      .fn<(request: Record<string, unknown>) => Promise<object>>()
      .mockResolvedValue({});
    // SAFETY: the transport only calls trigger.
    return { send: createNovuTransport({ trigger } as never).send, trigger };
  };

  it("triggers the workflow named after the event, for that subscriber", async () => {
    const { send, trigger } = setup();
    await send({
      eventId: "magic-link",
      idempotencyKey: "magic-link:1",
      locale: "de",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", locale: "de-AT", subscriberId: "user_1" },
    });
    expect(trigger).toHaveBeenCalledWith({
      payload: { ...magicLinkPayload, locale: "de" },
      to: {
        email: "ada@example.com",
        locale: "de-AT",
        phone: undefined,
        subscriberId: "user_1",
      },
      transactionId: "magic-link:1",
      workflowId: "magic-link",
    });
  });

  it("leaves the language out of the payload when there is none", async () => {
    const { send, trigger } = setup();
    await send({
      eventId: "magic-link",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", subscriberId: "user_1" },
    });
    expect(trigger.mock.calls[0]?.[0]?.payload).toEqual(magicLinkPayload);
  });
});

describe("the log transport", () => {
  it("records what would have been sent", async () => {
    const transport = createLogTransport();
    await transport.send({
      eventId: "magic-link",
      locale: "fr",
      payload: magicLinkPayload,
      to: { email: "ada@example.com", subscriberId: "user_1" },
    });
    expect(transport.sent).toEqual([
      { eventId: "magic-link", locale: "fr", to: "ada@example.com" },
    ]);
  });
});
