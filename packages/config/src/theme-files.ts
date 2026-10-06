import path from "node:path";

import {
  nativeThemeCss,
  nativeThemeVariablesJson,
  webThemeCss,
} from "./theme-css";

// src -> packages/config/generated
const generatedDir = path.resolve(import.meta.dirname, "..", "generated");

/**
 * Every file generated from the theme, with the content it must have. The generator writes
 * these; a test reads the files on disk and fails if any differs (someone changed the theme
 * or a generated file by hand without running `pnpm theme:generate`).
 *
 * They live inside this package and are imported from it (`@repo/config/web.css`), so this
 * package never writes into another workspace.
 */
export const generatedFiles = () => [
  { content: webThemeCss(), file: path.join(generatedDir, "web.css") },
  { content: nativeThemeCss(), file: path.join(generatedDir, "native.css") },
  {
    content: nativeThemeVariablesJson(),
    file: path.join(generatedDir, "native-variables.json"),
  },
];
