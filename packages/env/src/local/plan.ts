/*
 * What `pnpm setup:local` writes to a new .env: everything needed to run the project on one
 * machine with no accounts. Packages add their disposable local values here when they arrive
 * (the Docker Postgres URL, the S3 emulator, fresh random secrets). Anything that needs an
 * account is left out, and the feature that uses it switches itself off.
 */

export interface LocalEnv {
  /** Lines for the .env file, in order. Comments start with #. */
  lines: string[];
  /** Just the key/value pairs, for tests and for printing a summary. */
  values: Record<string, string>;
}

export const buildLocalEnv = (): LocalEnv => {
  const sections: { comment: string; values: Record<string, string> }[] = [
    { comment: "Runtime", values: { NODE_ENV: "development" } },
  ];

  const lines: string[] = [
    "# Written by `pnpm setup:local`. Local development only; this file is git-ignored.",
    "# Optional services are described in .env.example. Leave them out and those features stay off.",
  ];
  const values: Record<string, string> = {};
  for (const { comment, values: group } of sections) {
    lines.push("", `# ${comment}`);
    for (const [key, value] of Object.entries(group)) {
      lines.push(`${key}=${value}`);
      values[key] = value;
    }
  }
  return { lines, values };
};
