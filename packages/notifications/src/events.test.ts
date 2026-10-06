import { app } from "@repo/config/app";
import { emailIds, registry } from "@repo/emails/registry";
import { describe, expect, it } from "vitest";

import { eventIds, events } from "./events";

const BASE_URL = "https://example.com";

/** What a caller would pass: the email's preview props without what notify() fills in. */
const callerPayload = (id: (typeof eventIds)[number]) => {
  const {
    baseUrl: _baseUrl,
    locale: _locale,
    ...rest
  } = registry[id].previewProps;
  return rest;
};

describe("the event catalog", () => {
  it("has exactly one event per email template", () => {
    expect([...eventIds].toSorted()).toEqual([...emailIds].toSorted());
  });

  it("accepts the data each email's preview uses", () => {
    for (const id of eventIds) {
      expect(events[id].payload.safeParse(callerPayload(id)).success, id).toBe(
        true
      );
    }
  });

  it("renders every event's email from that data", async () => {
    const rendered = await Promise.all(
      eventIds.map(async (id) => ({
        id,
        ...(await events[id].renderEmail(callerPayload(id), {
          baseUrl: BASE_URL,
        })),
      }))
    );
    for (const { html, id, subject } of rendered) {
      expect(subject, id).not.toBe("");
      expect(html, id).toContain(BASE_URL);
    }
  });

  it("renders in the recipient's language", async () => {
    const { subject } = await events["verify-email"].renderEmail(
      callerPayload("verify-email"),
      { baseUrl: BASE_URL, locale: "de" }
    );
    expect(subject).toBe("Bestätige deine E-Mail-Adresse");
  });

  it("rejects missing, malformed and empty data", () => {
    const valid = callerPayload("verify-email");
    const bad = [
      { ...valid, name: "" },
      { ...valid, url: "not a url" },
      { ...valid, expiresIn: {} },
      { ...valid, expiresIn: { minutes: 0 } },
      { ...valid, expiresIn: { minutes: 1.5 } },
      { ...valid, locale: "klingon" },
    ];
    for (const payload of bad) {
      expect(events["verify-email"].payload.safeParse(payload).success).toBe(
        false
      );
    }
    const { url: _url, ...withoutUrl } = valid;
    expect(events["verify-email"].payload.safeParse(withoutUrl).success).toBe(
      false
    );
  });

  it("accepts any language the app ships, and none", () => {
    const valid = callerPayload("magic-link");
    for (const locale of [...app.i18n.locales, undefined]) {
      expect(
        events["magic-link"].payload.safeParse({ ...valid, locale }).success
      ).toBe(true);
    }
  });

  it("lets only the invitation be switched off by the user", () => {
    expect(events["organization-invitation"].critical).toBe(false);
    for (const id of eventIds.filter(
      (entry) => entry !== "organization-invitation"
    )) {
      expect(events[id].critical, id).toBe(true);
    }
  });

  it("has no push messages yet, and refuses to build one", () => {
    for (const id of eventIds) {
      expect(events[id].hasPush).toBe(false);
      expect(() => events[id].renderPush(callerPayload(id))).toThrow(
        "no push message"
      );
    }
  });
});
