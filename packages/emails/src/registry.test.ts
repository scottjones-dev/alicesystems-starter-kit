import { app } from "@repo/config/app";
import { intlLocale } from "@repo/internationalization/format";
import { describe, expect, it } from "vitest";

import { emailIds, registry, renderEmail } from "./registry";

const BASE_URL = "https://staging.example.com";
const UNFILLED_PLACEHOLDER = "{{";

/** The link each template is built around, taken from its preview props. */
const actionUrl = (id: (typeof emailIds)[number]) =>
  registry[id].previewProps.url;

describe("the registry", () => {
  it("has the five templates, each under its own id", () => {
    expect([...emailIds].toSorted()).toEqual([
      "delete-account",
      "magic-link",
      "organization-invitation",
      "reset-password",
      "verify-email",
    ]);
    for (const id of emailIds) {
      expect(registry[id].id).toBe(id);
    }
  });
});

describe("every template in every language", () => {
  for (const id of emailIds) {
    for (const locale of app.i18n.locales) {
      it(`renders ${id} in ${locale}`, async () => {
        const entry = registry[id];
        const props = { ...entry.previewProps, baseUrl: BASE_URL, locale };
        const { html, subject, text } = await entry.render(props as never);

        expect(subject.trim()).not.toBe("");
        expect(html).toContain(`lang="${intlLocale(locale)}"`);
        // The action link is in the HTML and in the plain text.
        expect(html).toContain(actionUrl(id));
        expect(text).toContain(actionUrl(id));
        // Footer links point at the environment the email is sent from.
        expect(html).toContain(`${BASE_URL}${app.links.privacy}`);
        expect(html).toContain(`${BASE_URL}${app.links.terms}`);
        // Nothing was left unfilled.
        for (const output of [html, text, subject]) {
          expect(output).not.toContain(UNFILLED_PLACEHOLDER);
          expect(output).not.toContain("undefined");
        }
      });
    }
  }
});

describe("renderEmail", () => {
  it("returns the same thing as the template's own render", async () => {
    const entry = registry["magic-link"];
    expect(await renderEmail("magic-link", entry.previewProps)).toEqual(
      await entry.render(entry.previewProps)
    );
  });

  it("writes the subject in the recipient's language", async () => {
    const props = registry["verify-email"].previewProps;
    expect(
      (await renderEmail("verify-email", { ...props, locale: "de" })).subject
    ).toBe("Bestätige deine E-Mail-Adresse");
    expect(
      (await renderEmail("verify-email", { ...props, locale: "zh" })).subject
    ).toBe("验证你的电子邮箱地址");
  });

  it("falls back to English for a language we do not ship", async () => {
    const props = registry["verify-email"].previewProps;
    const { subject } = await renderEmail("verify-email", {
      ...props,
      locale: "ja",
    });
    expect(subject).toBe("Verify your email address");
  });

  it("puts the names into the invitation subject", async () => {
    const props = registry["organization-invitation"].previewProps;
    const { subject } = await renderEmail("organization-invitation", {
      ...props,
      inviterName: "Sam",
      organizationName: "Acme",
    });
    expect(subject).toBe("Sam invited you to Acme");
  });

  it("writes how long a link lasts in the recipient's language", async () => {
    const props = registry["verify-email"].previewProps;
    const german = await renderEmail("verify-email", {
      ...props,
      expiresIn: { hours: 24 },
      locale: "de",
    });
    expect(german.text).toContain("24 Stunden");
  });

  it("escapes anything a person typed, so a name cannot inject markup", async () => {
    const props = registry["verify-email"].previewProps;
    const { html } = await renderEmail("verify-email", {
      ...props,
      name: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("the look", () => {
  it("asks mail clients to leave the email in one colour scheme", async () => {
    const { html } = await renderEmail(
      "magic-link",
      registry["magic-link"].previewProps
    );
    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('content="light only"');
  });

  it("has no dark-mode stylesheet and no framework classes", async () => {
    const { html } = await renderEmail(
      "reset-password",
      registry["reset-password"].previewProps
    );
    expect(html).not.toContain("prefers-color-scheme");
    expect(html).not.toContain("<style");
  });
});
