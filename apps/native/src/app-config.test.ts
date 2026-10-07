import { readFileSync } from "node:fs";
import path from "node:path";

import { app } from "@repo/config/app";
import { theme } from "@repo/config/theme";
import { describe, expect, it } from "vitest";

/*
 * app.json is plain JSON, so it cannot import @repo/config. This test is what keeps the two
 * from drifting: the name, the link scheme and the splash colour are written in both places.
 */

interface AppJson {
  expo: {
    name: string;
    plugins: (string | [string, Record<string, unknown>])[];
    scheme: string;
    slug: string;
    userInterfaceStyle: string;
  };
}

const appJson = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "..", "app.json"), "utf-8")
) as AppJson;

const NON_SLUG_CHARACTERS = /[^a-z0-9]+/gu;
const EDGE_HYPHENS = /^-+|-+$/gu;
const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS, "-")
    .replace(EDGE_HYPHENS, "");

describe("app.json", () => {
  it("uses the product name from @repo/config", () => {
    expect(appJson.expo.name).toBe(app.name);
  });

  it("has a slug made from that name", () => {
    expect(appJson.expo.slug).toBe(slugOf(app.name));
  });

  it("uses the deep-link scheme from @repo/config, which auth trusts for redirects", () => {
    expect(appJson.expo.scheme).toBe(app.scheme);
  });

  it("starts on the light theme's background, then follows the device", () => {
    const splash = appJson.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen"
    );
    expect(Array.isArray(splash) && splash[1].backgroundColor).toBe(
      theme.colors.light.background
    );
    expect(appJson.expo.userInterfaceStyle).toBe("automatic");
  });
});

describe("NativeWind setup", () => {
  const read = (file: string) =>
    readFileSync(path.join(import.meta.dirname, "..", file), "utf-8");

  it("takes its colours from the generated stylesheet in @repo/config", () => {
    expect(read("src/global.css")).toContain(
      '@import "@repo/config/native.css"'
    );
  });

  it("keeps the theme variables out of build-time inlining, so dark mode can switch at runtime", () => {
    expect(read("metro.config.js")).toContain(
      "@repo/config/native-variables.json"
    );
  });

  it("runs Tailwind through PostCSS from a .mjs file, the only name Expo picks up", () => {
    expect(read("postcss.config.mjs")).toContain("@tailwindcss/postcss");
  });
});
