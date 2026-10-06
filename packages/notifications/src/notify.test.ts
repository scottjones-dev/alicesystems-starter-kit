import { registry } from "@repo/emails/registry";
import { describe, expect, it, vi } from "vitest";

import { createNotify } from "./notify";
import type { SendInput, Transport } from "./transports";
import { createLogTransport } from "./transports";

const payload = (() => {
  const {
    baseUrl: _baseUrl,
    locale: _locale,
    ...rest
  } = registry["magic-link"].previewProps;
  return rest;
})();

const setup = (transport?: Transport) => {
  const log =
    vi.fn<(message: string, details: Record<string, string>) => void>();
  const logged = createLogTransport();
  const calls: SendInput<"magic-link">[] = [];
  const recording: Transport = {
    name: "log",
    send: (input) => {
      calls.push(input as SendInput<"magic-link">);
      return Promise.resolve();
    },
  };
  return {
    calls,
    log,
    logged,
    notify: createNotify({ log, transport: transport ?? recording }),
  };
};

describe("notify", () => {
  it("hands a valid notification to the transport", async () => {
    const { calls, notify } = setup();
    await notify("magic-link", {
      idempotencyKey: "magic-link:1",
      payload,
      to: { email: "a@example.com", subscriberId: "user_1" },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      eventId: "magic-link",
      idempotencyKey: "magic-link:1",
      payload,
      to: { email: "a@example.com", subscriberId: "user_1" },
    });
  });

  it("works out the recipient's language, and uses English for one we do not ship", async () => {
    const { calls, notify } = setup();
    await notify("magic-link", {
      payload,
      to: { email: "a@b.co", locale: "de-AT" },
    });
    await notify("magic-link", {
      payload,
      to: { email: "a@b.co", locale: "ja" },
    });
    await notify("magic-link", { payload, to: { email: "a@b.co" } });
    expect(calls.map((call) => call.locale)).toEqual([
      "de",
      undefined,
      undefined,
    ]);
  });

  it("makes a subscriber id from the address for someone without an account", async () => {
    const { calls, notify } = setup();
    await notify("magic-link", {
      payload,
      to: { email: "invitee@example.com" },
    });
    expect(calls[0]?.to.subscriberId).toBe("email:invitee@example.com");
  });

  it("never throws, and tells the log which event and transport failed", async () => {
    const failing: Transport = {
      name: "novu",
      send: () => Promise.reject(new Error("Novu is down")),
    };
    const { log, notify } = setup(failing);
    await expect(
      notify("magic-link", { payload, to: { email: "a@b.co" } })
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("notify failed", {
      error: "Novu is down",
      eventId: "magic-link",
      transport: "novu",
    });
  });

  it("refuses invalid data before anything is sent, and never logs the values", async () => {
    const { calls, log, notify } = setup();
    const secret = "https://example.com/reset?token=SECRET-TOKEN";
    await notify("magic-link", {
      payload: { ...payload, expiresIn: {}, url: "not a url SECRET-TOKEN" },
      to: { email: "private@example.com", subscriberId: "user_1" },
    });
    expect(calls).toHaveLength(0);
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("invalid payload");
    expect(logged).toContain("url");
    expect(logged).toContain("expiresIn");
    for (const private_ of [
      "SECRET-TOKEN",
      secret,
      "private@example.com",
      "user_1",
    ]) {
      expect(logged).not.toContain(private_);
    }
  });

  it("works with the log transport used in tests", async () => {
    const { logged } = setup();
    const notify = createNotify({ log: vi.fn(), transport: logged });
    await notify("magic-link", {
      payload,
      to: { email: "a@b.co", locale: "fr" },
    });
    expect(logged.sent).toEqual([
      { eventId: "magic-link", locale: "fr", to: "a@b.co" },
    ]);
  });
});
