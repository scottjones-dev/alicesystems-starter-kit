import { writeFileSync } from "node:fs";
import path from "node:path";

import { buildResourcesSource, readListing } from "../resources-source";

/*
 * `pnpm catalogs:generate`: writes src/resources.ts from the folders in src/locales.
 * Run it after adding or removing a language or a namespace.
 */

const src = path.resolve(import.meta.dirname, "..");
const target = path.join(src, "resources.ts");

writeFileSync(
  target,
  buildResourcesSource(readListing(path.join(src, "locales")))
);
console.log(`Wrote ${target}`);
