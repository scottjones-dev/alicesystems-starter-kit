import { app } from "@repo/config/app";

/*
 * Picks the language to show. Pure functions, no I/O, shared by the API, the website and the
 * native app. The languages we ship are listed once, in @repo/config/app (app.i18n).
 */

export type Locale = (typeof app.i18n.locales)[number];

export const locales: readonly Locale[] = app.i18n.locales;
export const defaultLocale: Locale = app.i18n.defaultLocale;

/** Matches a language tag such as `pl`, `pl-PL`, `en_GB`, `zh-Hans-CN` and captures the language. */
const LANGUAGE_TAG = /^(?<language>[a-z]{2,3})(?:[-_][a-z0-9]+)*$/iu;

/** `es-MX` becomes `es`. Returns undefined when the language is not one we ship. */
export const toLocale = (input?: string | null): Locale | undefined => {
  const language = LANGUAGE_TAG.exec(input?.trim() ?? "")?.groups?.language;
  return locales.find((locale) => locale === language?.toLowerCase());
};

interface WeightedTag {
  quality: number;
  tag: string;
}

const parseTag = (part: string): WeightedTag => {
  const [tag = "", ...params] = part.split(";");
  const qParam = params.find((param) => param.trim().startsWith("q="));
  const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
  return { quality: Number.isNaN(quality) ? 0 : quality, tag: tag.trim() };
};

/**
 * Reads an `Accept-Language` header, for example `de-DE,de;q=0.9,en;q=0.8`, and returns the
 * first language we ship, in the order the browser prefers them.
 */
export const parseAcceptLanguage = (
  header: string | null | undefined
): Locale | undefined => {
  const ranked = (header ?? "")
    .split(",")
    .map(parseTag)
    .filter(({ quality }) => quality > 0)
    // sort() is stable, so equal weights keep the browser's own order.
    .toSorted((a, b) => b.quality - a.quality);
  return ranked.map(({ tag }) => toLocale(tag)).find(Boolean);
};

interface ResolveInput {
  /** `Accept-Language` request header (web). */
  acceptLanguage?: string | null;
  /** The remembered choice of a signed-out visitor or a shared device (cookie). */
  cookie?: string | null;
  /** The device language (native). */
  device?: string | null;
  /** The signed-in user's saved language (`user.locale`). */
  user?: string | null;
}

/**
 * The language to use, in this order: the signed-in user's choice, the remembered cookie,
 * the browser's preference, the device language, then the default.
 */
export const resolveLocale = ({
  acceptLanguage,
  cookie,
  device,
  user,
}: ResolveInput): Locale =>
  toLocale(user) ??
  toLocale(cookie) ??
  parseAcceptLanguage(acceptLanguage) ??
  toLocale(device) ??
  defaultLocale;
