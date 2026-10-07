import {
  createUrlTools,
  FILTERED,
  ONE_TIME_LINK_SECTIONS,
} from "@repo/analytics/url";

/*
 * Removes personal data from what we send to Sentry and write to logs. Every runtime (API,
 * web, native) uses the same functions through `baseSentryOptions()` and `createLogger()`, so
 * the rules are written once. This file imports no SDK: the types below are structural, and
 * the SDKs' own event and breadcrumb types are assignable to them.
 *
 * What counts as sensitive differs per product (a child's name, a card number, a till total),
 * so this package ships a short generic list and each platform adds its own words with
 * `createScrubber({ extraKeys })`.
 */

/**
 * Words that make a key sensitive, written as lowercase letters and digits. A key is split
 * into words first (`apiKey`, `api_key` and `API-KEY` are all "api" and "key"), so
 * `footprint` is not mistaken for `otp`. Plurals match too (`tokens`).
 */
export const BASE_SENSITIVE_WORDS = [
  "accesskey",
  "apikey",
  "auth",
  "authorization",
  "birth",
  "cookie",
  "csrf",
  "displayname",
  "dob",
  "email",
  "familyname",
  "firstname",
  "fullname",
  "givenname",
  "lastname",
  "otp",
  "pass",
  "passcode",
  "passwd",
  "password",
  "phone",
  "privatekey",
  "secret",
  "secretkey",
  "session",
  "signature",
  "surname",
  "token",
  "username",
] as const;

/** Request headers that identify a person or carry a credential. */
const SENSITIVE_HEADER =
  /^(?:authorization|cookie|set-cookie|x-forwarded-for|x-real-ip|cf-connecting-ip|x-api-key|novu-signature)$/iu;

/** An email address inside free text, such as an error message. */
const EMAIL_IN_TEXT = /[^\s@<>"'()=]+@[^\s@<>"'()]+\.[^\s@<>"'()]+/gu;

/** Where a lowercase letter or digit is followed by a capital: `apiKey` becomes `api Key`. */
const CAMEL_BOUNDARY = /(?<before>[a-z\d])(?<after>[A-Z])/gu;
const NOT_ALPHANUMERIC = /[^a-z\d]+/u;
const TRAILING_S = /s$/u;

/** A word an app adds must be plain, so it cannot be mistaken for a pattern. */
const PLAIN_WORD = /^[a-z\d]+$/u;

const MAX_DEPTH = 6;

/**
 * The longest text kept. The email pattern re-scans from every position, so on a long run of
 * text with no "@" its time grows with the square of the length (200,000 characters took
 * almost 30 seconds). Sentry shortens messages itself, far below this, so cutting here loses
 * nothing useful and bounds the work.
 */
const MAX_TEXT_LENGTH = 4096;

const REQUEST_BODY_CATEGORIES = new Set(["fetch", "xhr", "http"]);

export interface ScrubbableBreadcrumb {
  category?: string;
  data?: Record<string, unknown>;
  message?: string;
}

export interface ScrubbableEvent {
  breadcrumbs?: ScrubbableBreadcrumb[];
  contexts?: Record<string, unknown>;
  exception?: { values?: { value?: string }[] };
  extra?: Record<string, unknown>;
  message?: string;
  request?: {
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, string>;
    query_string?: unknown;
    url?: string;
  };
  server_name?: string;
  tags?: Record<string, unknown>;
  transaction?: string;
  user?: {
    email?: string;
    id?: number | string;
    ip_address?: string | null;
    username?: string;
  };
}

export interface ScrubberOptions {
  /** More key words to hide, for this platform (lowercase letters and digits, e.g. `note`). */
  extraKeys?: readonly string[];
  /** More page sections whose address holds a one-time secret, for this platform. */
  secretSections?: readonly string[];
}

const wordsOf = (key: string): string[] =>
  key
    .replace(CAMEL_BOUNDARY, "$<before> $<after>")
    .toLowerCase()
    .split(NOT_ALPHANUMERIC)
    .filter(Boolean);

/**
 * Builds the privacy rules. The defaults cover the pages auth sends links to and the keys that
 * hold credentials or contact details; a platform adds its own without editing this package.
 */
export const createScrubber = ({
  extraKeys = [],
  secretSections = [],
}: ScrubberOptions = {}) => {
  for (const word of extraKeys) {
    if (!PLAIN_WORD.test(word)) {
      throw new Error(
        `"${word}" is not a valid key word: use lowercase letters and digits only.`
      );
    }
  }
  const sensitiveWords = new Set<string>([
    ...BASE_SENSITIVE_WORDS,
    ...extraKeys,
  ]);
  const { scrubUrl } = createUrlTools([
    ...ONE_TIME_LINK_SECTIONS,
    ...secretSections,
  ]);

  const isSensitiveWord = (word: string) =>
    sensitiveWords.has(word) ||
    sensitiveWords.has(word.replace(TRAILING_S, ""));

  /** True when the key, read as words, holds a sensitive word or a sensitive pair (`api`+`key`). */
  const isSensitiveKey = (key: string): boolean => {
    const words = wordsOf(key);
    return words.some(
      (word, index) =>
        isSensitiveWord(word) ||
        (index > 0 && isSensitiveWord(`${words[index - 1]}${word}`))
    );
  };

  /** Error messages can carry data (a database error can quote the row), so hide emails in text. */
  const scrubText = (text: string): string =>
    text.slice(0, MAX_TEXT_LENGTH).replace(EMAIL_IN_TEXT, FILTERED);

  const scrubValue = (value: unknown, depth = 0): unknown => {
    if (depth > MAX_DEPTH) {
      return FILTERED;
    }
    if (typeof value === "string") {
      return scrubText(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => scrubValue(item, depth + 1));
    }
    if (value && typeof value === "object") {
      const clean: Record<string, unknown> = {};
      for (const [key, inner] of Object.entries(value)) {
        clean[key] = isSensitiveKey(key)
          ? FILTERED
          : scrubValue(inner, depth + 1);
      }
      return clean;
    }
    return value;
  };

  /** An object in, an object out: scrubValue keeps the shape of what it is given. */
  const scrubRecord = (record: Record<string, unknown>) =>
    // SAFETY: scrubValue returns an object for an object input.
    scrubValue(record) as Record<string, unknown>;

  /**
   * For Sentry's `beforeBreadcrumb`. Returns null to drop the breadcrumb.
   * Console output and taps/typing are dropped (they can contain names, notes or ids);
   * network breadcrumbs keep the method and status but lose bodies and query secrets.
   */
  const scrubBreadcrumb = <B extends ScrubbableBreadcrumb>(
    breadcrumb: B
  ): B | null => {
    const category = breadcrumb.category ?? "";
    if (category === "console" || category.startsWith("ui.")) {
      return null;
    }
    const clean: B = {
      ...breadcrumb,
      message: breadcrumb.message
        ? scrubText(breadcrumb.message)
        : breadcrumb.message,
    };
    if (!breadcrumb.data) {
      return clean;
    }
    const data = scrubRecord(breadcrumb.data);
    if (REQUEST_BODY_CATEGORIES.has(category) && typeof data.url === "string") {
      data.url = scrubUrl(data.url);
    }
    return { ...clean, data };
  };

  /** Drops the body, cookies and credentials from a request, and hides secrets in its address. */
  const scrubRequest = (request: NonNullable<ScrubbableEvent["request"]>) => {
    // Cookies, body and query string are left out of `rest` on purpose.
    const {
      cookies: _cookies,
      data: _data,
      headers,
      query_string: _queryString,
      url,
      ...rest
    } = request;
    return {
      ...rest,
      headers: Object.fromEntries(
        Object.entries(headers ?? {}).filter(
          ([name]) => !SENSITIVE_HEADER.test(name)
        )
      ),
      url: url ? scrubUrl(url) : url,
    };
  };

  /** Each part of the event that can hold free-form data goes through the same value rules. */
  const scrubDataBags = <E extends ScrubbableEvent>(event: E): E => {
    const clean: E = { ...event };
    if (clean.extra) {
      clean.extra = scrubRecord(clean.extra);
    }
    if (clean.contexts) {
      clean.contexts = scrubRecord(clean.contexts);
    }
    if (clean.tags) {
      clean.tags = scrubRecord(clean.tags);
    }
    if (clean.breadcrumbs) {
      clean.breadcrumbs = clean.breadcrumbs.flatMap((crumb) => {
        const kept = scrubBreadcrumb(crumb);
        return kept ? [kept] : [];
      });
    }
    return clean;
  };

  /** The texts of an event: its message, the page it happened on and its exceptions. */
  const scrubTexts = <E extends ScrubbableEvent>(event: E): E => {
    const clean: E = { ...event };
    if (clean.message) {
      clean.message = scrubText(clean.message);
    }
    // On a browser page load the transaction name is the page's path, which can hold a secret.
    if (clean.transaction?.startsWith("/")) {
      clean.transaction = scrubUrl(clean.transaction);
    }
    if (clean.exception?.values) {
      clean.exception = {
        ...clean.exception,
        values: clean.exception.values.map((entry) => ({
          ...entry,
          value: entry.value ? scrubText(entry.value) : entry.value,
        })),
      };
    }
    return clean;
  };

  /** For Sentry's `beforeSend`. Removes request bodies, credentials and personal fields. */
  const scrubEvent = <E extends ScrubbableEvent>(event: E): E => {
    const clean = scrubTexts(scrubDataBags(event));
    if (clean.request) {
      clean.request = scrubRequest(clean.request);
    }
    // Keep an opaque id only; never an email, username or IP address.
    if (clean.user) {
      clean.user = clean.user.id ? { id: clean.user.id } : {};
    }
    // The host name can identify infrastructure and people's machines in development.
    clean.server_name = undefined;
    return clean;
  };

  return {
    isSensitiveKey,
    scrubBreadcrumb,
    scrubEvent,
    scrubText,
    scrubUrl,
    scrubValue,
  };
};

export type Scrubber = ReturnType<typeof createScrubber>;

/** The rules with nothing added. Platforms with their own words build their own scrubber. */
export const defaultScrubber: Scrubber = createScrubber();
