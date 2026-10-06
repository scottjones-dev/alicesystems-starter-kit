import { app } from "@repo/config/app";
import type { LanguageCatalogs } from "../catalog-check";
import { checkAll } from "../catalog-check";
import { resources } from "../resources";

/*
 * `pnpm catalogs:check`: fails if a language is incomplete or inconsistent. It also runs in the
 * unit tests, so CI catches a missing translation.
 */

// SAFETY: the generated resources are plain nested JSON objects, which is what Catalog describes.
const problems = checkAll(
  resources as Record<string, LanguageCatalogs>,
  app.i18n.locales,
  app.i18n.defaultLocale
);

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `All ${app.i18n.locales.length} languages are complete and consistent.`
);
