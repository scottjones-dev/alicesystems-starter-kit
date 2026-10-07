// The Tailwind setup is shared; @repo/ui owns it.
// biome-ignore lint/performance/noBarrelFile: a one-line re-export is how Next reads PostCSS config
export { default } from "@repo/ui/postcss.config";
