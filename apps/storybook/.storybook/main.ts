import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Resolves a package to its folder. Needed in a monorepo, where Storybook's own packages are
 * not always where it first looks.
 */
const getAbsolutePath = (value: string): string =>
  dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));

const config: StorybookConfig = {
  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath("@storybook/addon-themes"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  stories: ["../stories/**/*.mdx", "../stories/**/*.stories.@(ts|tsx)"],
};

export default config;
