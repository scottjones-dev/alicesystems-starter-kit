import { spawnSync } from "node:child_process";

import { loadRootEnv } from "@repo/env/load";

/*
 * `pnpm translate`: asks Languine to translate what changed in the default language
 * (src/locales/en) into the other languages listed in languine.json. Needs LANGUINE_API_KEY,
 * from the root .env (`pnpm env:pull`) or the shell. Read what it wrote before committing:
 * machine translations must be checked by someone who speaks the language.
 */

loadRootEnv();

if (!process.env.LANGUINE_API_KEY) {
  throw new Error(
    "LANGUINE_API_KEY is not set. Get one at https://languine.ai, put it in Infisical /internationalization, then run `pnpm env:pull`."
  );
}

// languine.json has no projectId on purpose (it would be committed); Languine reads this variable.
if (!process.env.LANGUINE_PROJECT_ID) {
  throw new Error(
    "LANGUINE_PROJECT_ID is not set. Copy the project ID (prj_...) from https://languine.ai, put it in Infisical /internationalization, then run `pnpm env:pull`."
  );
}

// Extra flags (e.g. `pnpm translate --force`) go straight through to Languine.
const extraArgs = process.argv.slice(2);

const result = spawnSync(
  "pnpm",
  ["dlx", "languine@latest", "translate", ...extraArgs],
  {
    shell: true,
    stdio: "inherit",
  }
);
process.exit(result.status ?? 1);
