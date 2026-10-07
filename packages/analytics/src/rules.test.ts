import { describe, expect, it } from "vitest";

import {
  createAnalyticsRules,
  DEFAULT_DENIED_PROPERTIES,
  rules,
} from "./rules";
import { FILTERED } from "./url";

const { beforeSend } = rules;
const FILTERED_ENCODED = encodeURIComponent(FILTERED);

describe("beforeSend", () => {
  it("passes null through", () => {
    expect(beforeSend(null)).toBeNull();
  });

  it("leaves events without properties alone", () => {
    expect(beforeSend({ event: "sign_up_completed" })).toStrictEqual({
      event: "sign_up_completed",
    });
  });

  it("drops events from untracked pages and screens", () => {
    expect(
      beforeSend({
        event: "$pageview",
        properties: { $current_url: "http://localhost:3000/verify-email" },
      })
    ).toBeNull();
    expect(
      beforeSend({
        event: "$screen",
        properties: { $screen_name: "/verify-email" },
      })
    ).toBeNull();
    expect(
      beforeSend({
        event: "$pageview",
        properties: { $pathname: "/accept-invitation/inv_1" },
      })
    ).toBeNull();
  });

  it("hides secrets in addresses", () => {
    const sent = beforeSend({
      event: "$pageview",
      properties: {
        $current_url: "http://localhost:3000/welcome?token=SECRET&tab=1",
        $referrer: "https://example.com/?email=a@b.c",
      },
    });
    expect(sent?.properties?.$current_url).toBe(
      `http://localhost:3000/welcome?token=${FILTERED_ENCODED}&tab=1`
    );
    expect(sent?.properties?.$referrer).toBe(
      `https://example.com/?email=${FILTERED_ENCODED}`
    );
  });

  it("hides the one-time token in the page the visitor came from (posthog-js sends it on the next pageview)", () => {
    const sent = beforeSend({
      event: "$pageview",
      properties: {
        $current_url: "https://example.com/dashboard",
        $prev_pageview_pathname: "/reset-password/SECRET-TOKEN",
      },
    });
    expect(sent?.properties?.$prev_pageview_pathname).toBe(
      `/reset-password/${FILTERED}`
    );
    expect(JSON.stringify(sent)).not.toContain("SECRET-TOKEN");
  });

  it("hides secrets in the initial-visit properties too, including inside $set and $set_once", () => {
    const sent = beforeSend({
      $set: { $initial_current_url: "https://x.test/delete-account/SECRET" },
      $set_once: {
        $initial_pathname: "/verify-email/SECRET",
        $initial_referrer: "https://x.test/?token=SECRET",
        plan: "free",
      },
      event: "$pageview",
      properties: {
        $initial_current_url: "https://x.test/reset-password/SECRET",
        $session_entry_url: "https://x.test/?email=a@b.c&secret=SECRET",
      },
    });
    expect(JSON.stringify(sent)).not.toContain("SECRET");
    expect(JSON.stringify(sent)).not.toContain("a@b.c");
    expect(sent?.$set_once?.plan).toBe("free");
  });

  it("does not drop an event just because the page before it was a one-time link", () => {
    const sent = beforeSend({
      event: "$pageview",
      properties: {
        $current_url: "https://example.com/dashboard",
        $prev_pageview_pathname: "/reset-password/abc",
      },
    });
    expect(sent).not.toBeNull();
  });

  it("leaves non-address values such as $direct and numbers alone", () => {
    const sent = beforeSend({
      event: "$pageview",
      properties: { $referrer: "$direct", $screen_width: 390 },
    });
    expect(sent?.properties).toStrictEqual({
      $referrer: "$direct",
      $screen_width: 390,
    });
  });

  it("removes denied properties and keeps the rest", () => {
    const sent = beforeSend({
      event: "sign_in_completed",
      properties: { email: "a@b.c", method: "google" },
    });
    expect(sent?.properties).toStrictEqual({ method: "google" });
  });

  it("does not change the event it was given", () => {
    const original = {
      event: "x",
      properties: {
        $current_url: "https://x.test/?token=SECRET",
        email: "a@b.c",
      },
    };
    beforeSend(original);
    expect(original.properties.email).toBe("a@b.c");
    expect(original.properties.$current_url).toContain("SECRET");
  });
});

describe("createAnalyticsRules", () => {
  it("lets a platform add a page that carries a secret", () => {
    const custom = createAnalyticsRules({
      secretSections: ["approve-timesheet"],
    });
    expect(
      custom.beforeSend({
        event: "$pageview",
        properties: { $current_url: "https://x.test/approve-timesheet/abc" },
      })
    ).toBeNull();
    // The default rules keep it.
    expect(
      beforeSend({
        event: "$pageview",
        properties: { $current_url: "https://x.test/approve-timesheet/abc" },
      })
    ).not.toBeNull();
  });

  it("lets a platform deny more property names, without losing the defaults", () => {
    const custom = createAnalyticsRules({ deniedProperties: ["child_name"] });
    const sent = custom.beforeSend({
      event: "x",
      properties: { child_name: "Ada", email: "a@b.c", ok: true },
    });
    expect(sent?.properties).toStrictEqual({ ok: true });
    for (const name of DEFAULT_DENIED_PROPERTIES) {
      expect(custom.deniedProperties).toContain(name);
    }
  });
});
