import { app } from "@repo/config/app";

import { toLocale } from "./resolve";

/*
 * Dates, numbers, money and lists for people. Always pass the person's language: the same
 * value is written differently in German, French and Chinese. English uses the regional
 * flavour in app.locale (en-GB: "1 October 2026", 24-hour times).
 */

/** The full locale tag for Intl and `<html lang>`: English gets its regional flavour, others use the language alone. */
export const intlLocale = (language: string | null | undefined): string => {
  const locale = toLocale(language);
  return !locale || locale === "en" ? app.locale : locale;
};

/** "1 October 2026, 14:32" in the person's language. */
export const formatDateTime = (
  date: Date,
  language: string | null | undefined,
  timeZone?: string
): string =>
  new Intl.DateTimeFormat(intlLocale(language), {
    dateStyle: "long",
    hourCycle: "h23",
    timeStyle: "short",
    timeZone,
  }).format(date);

/** "1 October 2026" in the person's language. */
export const formatDate = (
  date: Date,
  language: string | null | undefined,
  timeZone?: string
): string =>
  new Intl.DateTimeFormat(intlLocale(language), {
    dateStyle: "long",
    timeZone,
  }).format(date);

export const formatNumber = (
  value: number,
  language: string | null | undefined,
  options?: Intl.NumberFormatOptions
): string => new Intl.NumberFormat(intlLocale(language), options).format(value);

/**
 * An amount of money. Money is stored as whole minor units (pence, cents), never as a
 * decimal: 1999 GBP is "£19.99". The currency decides how many decimals it has (GBP 2, JPY 0,
 * BHD 3), so the number is divided by the right power of ten.
 */
export const formatMoney = (
  minorUnits: number,
  currency: string,
  language: string | null | undefined
): string => {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error(
      `Money must be a whole number of minor units, got ${minorUnits}.`
    );
  }
  const formatter = new Intl.NumberFormat(intlLocale(language), {
    currency,
    style: "currency",
  });
  const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minorUnits / 10 ** decimals);
};

/**
 * A length of time in words: "15 minutes", "1 hour", "15分钟". The language supplies the
 * right word forms, so catalogs need no plural keys for it.
 */
export const formatDuration = (
  duration: Parameters<Intl.DurationFormat["format"]>[0],
  language: string | null | undefined
): string =>
  new Intl.DurationFormat(intlLocale(language), { style: "long" }).format(
    duration
  );

/** "A, B and C" with the right word and punctuation for the language. */
export const formatList = (
  items: string[],
  language: string | null | undefined
): string =>
  new Intl.ListFormat(intlLocale(language), {
    style: "long",
    type: "conjunction",
  }).format(items);
