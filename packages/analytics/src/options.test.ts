import { describe, expect, it } from "vitest";

import {
  POSTHOG_EU_HOST,
  POSTHOG_UI_HOST,
  posthogWebOptions,
  WEB_INGEST_PATH,
} from "./options";
import { rules } from "./rules";

describe("hosts", () => {
  it("send data to PostHog's EU region", () => {
    expect(POSTHOG_EU_HOST).toBe("https://eu.i.posthog.com");
    expect(POSTHOG_UI_HOST).toBe("https://eu.posthog.com");
  });
});

describe("posthogWebOptions", () => {
  it("sends events through our own domain", () => {
    expect(posthogWebOptions({ consented: true }).api_host).toBe(
      WEB_INGEST_PATH
    );
    expect(WEB_INGEST_PATH.startsWith("/")).toBe(true);
  });

  it("writes nothing to the visitor's device until they agree", () => {
    expect(posthogWebOptions({ consented: false }).persistence).toBe("memory");
    expect(posthogWebOptions({ consented: true }).persistence).toBe(
      "localStorage+cookie"
    );
  });

  it("switches off what could capture what is on screen", () => {
    for (const consented of [true, false]) {
      const options = posthogWebOptions({ consented });
      expect(options.autocapture).toBe(false);
      expect(options.disable_session_recording).toBe(true);
      expect(options.person_profiles).toBe("identified_only");
    }
  });

  it("filters every event through the privacy rules", () => {
    expect(posthogWebOptions({ consented: true }).before_send).toBe(
      rules.beforeSend
    );
  });

  it("respects the browser's do-not-track setting", () => {
    expect(posthogWebOptions({ consented: true }).respect_dnt).toBe(true);
  });
});
