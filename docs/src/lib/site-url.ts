const DEV_SITE_URL = "http://localhost:1000";

/**
 * The public address of this site, used for canonical links, the sitemap and social images.
 * It comes from `DOCS_SITE_URL` (scheme and host, no path), for example `https://docs.example.com`.
 *
 * In development it falls back to localhost. A production build without it fails on purpose:
 * the alternative is publishing a sitemap full of localhost links, which search engines
 * would quietly ignore. CI builds that only check the code can set `SKIP_ENV_VALIDATION=1`,
 * the same switch the other workspaces use.
 */
export function getSiteUrl(
  environment: Record<string, string | undefined> = process.env
): URL {
  const raw = environment.DOCS_SITE_URL;

  if (raw) {
    return new URL(raw);
  }

  const isProduction = environment.NODE_ENV === "production";
  const skipValidation = environment.SKIP_ENV_VALIDATION === "1";

  if (isProduction && !skipValidation) {
    throw new Error(
      "DOCS_SITE_URL is not set. Set it to the public address of the docs site (https://...), or set SKIP_ENV_VALIDATION=1 for a build that is not deployed."
    );
  }

  return new URL(DEV_SITE_URL);
}
