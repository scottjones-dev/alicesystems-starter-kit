/*
 * Hides one-time secrets in addresses before they reach an analytics service. Pure functions:
 * no SDK, no network. Some pages carry a secret in their address (a reset link, an
 * invitation), so those pages are never tracked, and a secret that shows up in a later
 * event's "previous page" is replaced by "[Filtered]".
 */

export const FILTERED = "[Filtered]";

/**
 * The first path segment of every page whose address holds a one-time secret, for example
 * `/reset-password/<token>`. Each platform adds its own with `createAnalyticsRules`.
 */
export const ONE_TIME_LINK_SECTIONS = [
  "accept-invitation",
  "delete-account",
  "magic-link",
  "reset-password",
  "verify-email",
] as const;

/** Query parameters that carry one-time links, codes or identities. */
const SENSITIVE_PARAM =
  /token|code|key|secret|email|state|password|signature|invitation/iu;

/** A section name is written into a regular expression, so it must be plain. */
const SECTION_NAME = /^[a-z0-9-]+$/u;

/** `%72` style escapes (two hex digits). */
const PERCENT_ESCAPE = /%(?<hex>[\da-f]{2})/giu;
/** Letters, digits and `-._~`: characters a URL may spell either way (RFC 3986). */
const UNRESERVED = /^[\w.~-]$/u;
const LEADING_SLASHES = /^\/{2,}(?=[^/])/u;

/**
 * Writes percent-escaped plain characters as themselves (`/%72eset-password` becomes
 * `/reset-password`). Both spellings reach the same page, so a pattern that only knows one
 * would miss the other. Escapes for anything else (`%2F`, `%20`) are left as they are, so
 * the address still means the same thing.
 */
export const normalizeUrl = (url: string): string =>
  url.replace(PERCENT_ESCAPE, (match, _hex, _offset, _whole, groups) => {
    const character = String.fromCodePoint(Number.parseInt(groups.hex, 16));
    return UNRESERVED.test(character) ? character : match;
  });

/** Filters the values of sensitive names in `a=1&b=2` text (a query string or a fragment). */
const scrubParams = (params: string): string => {
  const cleaned = new URLSearchParams();
  for (const [name, value] of new URLSearchParams(params)) {
    cleaned.append(name, SENSITIVE_PARAM.test(name) ? FILTERED : value);
  }
  return cleaned.toString();
};

/** The tools that depend on the list of secret-carrying sections. */
export const createUrlTools = (sections: readonly string[]) => {
  for (const section of sections) {
    if (!SECTION_NAME.test(section)) {
      throw new Error(
        `"${section}" is not a valid page section: use lowercase letters, digits and hyphens.`
      );
    }
  }
  const alternatives = sections.join("|");
  const secretPath = new RegExp(`/(?<section>${alternatives})/[^/?#]+`, "giu");
  const untrackedPath = new RegExp(`^/(?:${alternatives})(?:/|$)`, "iu");

  /** The path of a full address or a screen name, with its disguises removed. */
  const pathOf = (value: string): string => {
    // Percent-escaped letters become letters, and a run of leading slashes counts as one,
    // so `/%72eset-password` and `//reset-password` are recognised as the page they reach.
    const spelled = normalizeUrl(value).replace(LEADING_SLASHES, "/");
    try {
      return new URL(spelled, "http://local.invalid").pathname;
    } catch {
      return spelled;
    }
  };

  return {
    /** False for pages and screens we never track. Accepts a path or a full address. */
    isTrackedPath: (pathOrUrl: string): boolean =>
      !untrackedPath.test(pathOf(pathOrUrl)),

    /**
     * Hides one-time secrets in an address: secret path segments, and sensitive values in
     * the query and in the fragment (OAuth responses can come back as `#access_token=...`).
     * A fragment without `=` is just a page anchor and is kept.
     */
    scrubUrl: (url: string): string => {
      const withoutSecretPaths = normalizeUrl(url).replace(
        secretPath,
        `/$<section>/${FILTERED}`
      );
      const hashStart = withoutSecretPaths.indexOf("#");
      const beforeHash =
        hashStart === -1
          ? withoutSecretPaths
          : withoutSecretPaths.slice(0, hashStart);
      const hash =
        hashStart === -1 ? "" : withoutSecretPaths.slice(hashStart + 1);
      const queryStart = beforeHash.indexOf("?");
      const path =
        queryStart === -1 ? beforeHash : beforeHash.slice(0, queryStart);
      const query = queryStart === -1 ? "" : beforeHash.slice(queryStart + 1);

      const cleanQuery = query ? scrubParams(query) : "";
      const cleanHash = hash.includes("=") ? scrubParams(hash) : hash;
      return `${path}${cleanQuery ? `?${cleanQuery}` : ""}${cleanHash ? `#${cleanHash}` : ""}`;
    },
  };
};
