import { describe, expect, it } from "vitest";

import { app } from "./app";

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const LANGUAGE_CODE = /^[a-z]{2,3}$/u;
const REGION_LOCALE = /^[a-z]{2,3}-[A-Z]{2}$/u;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*$/u;
const MAILTO = /^mailto:/u;
const STARTS_WITH_SLASH = /^\//u;
const WEB_ADDRESS = /https?:\/\//u;

describe("app constants", () => {
  it("has a name and a description", () => {
    expect(app.name.length).toBeGreaterThan(0);
    expect(app.description.length).toBeGreaterThan(0);
  });

  it("lists the default language among the languages, each written in itself", () => {
    expect(app.i18n.locales).toContain(app.i18n.defaultLocale);
    for (const locale of app.i18n.locales) {
      expect(locale).toMatch(LANGUAGE_CODE);
      expect(app.i18n.names).toHaveProperty(locale);
    }
    expect(Object.keys(app.i18n.names).toSorted()).toEqual(
      [...app.i18n.locales].toSorted()
    );
  });

  it("uses a region locale for formatting, like en-GB", () => {
    expect(app.locale).toMatch(REGION_LOCALE);
  });

  it("has a deep-link scheme that is a valid URL scheme", () => {
    expect(app.scheme).toMatch(URL_SCHEME);
  });

  it("has email addresses that look like email addresses", () => {
    expect(app.email.replyTo).toMatch(EMAIL_ADDRESS);
    expect(app.links.support).toMatch(MAILTO);
    expect(app.links.support.slice("mailto:".length)).toMatch(EMAIL_ADDRESS);
  });

  it("keeps links as paths, so each environment supplies its own web address", () => {
    expect(app.links.privacy).toMatch(STARTS_WITH_SLASH);
    expect(app.links.terms).toMatch(STARTS_WITH_SLASH);
    expect(app.api.basePath).toMatch(STARTS_WITH_SLASH);
  });

  it("holds no web address: those come from environment keys", () => {
    expect(JSON.stringify(app)).not.toMatch(WEB_ADDRESS);
  });
});
