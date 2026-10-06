import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generatedFiles } from "../theme-files";

/*
 * `pnpm theme:generate`: writes the website's and the native app's theme files from
 * packages/config/src/theme.ts. Run it after changing a colour.
 */

for (const { content, file } of generatedFiles()) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`Wrote ${file}`);
}
