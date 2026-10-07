import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { tokenNames } from "@repo/config/theme";
import { describe, expect, it } from "vitest";

import { cn } from "./lib/utils";

/*
 * The components are written by the shadcn CLI, so what needs testing here is the wiring around
 * them: that the CLI writes where the imports will look, and that the stylesheet knows every
 * colour in the shared theme.
 */

const root = path.join(import.meta.dirname, "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf-8");
const readJson = <T>(file: string) => JSON.parse(read(file)) as T;

interface PackageJson {
  exports: Record<string, string>;
}
interface ComponentsJson {
  aliases: Record<string, string>;
  tailwind: { css: string };
}

const pkg = readJson<PackageJson>("package.json");
const own = readJson<ComponentsJson>("components.json");
const website = readJson<ComponentsJson>("../../apps/website/components.json");

describe("components.json", () => {
  it("makes the CLI write where the package exports them", () => {
    expect(own.aliases.ui).toBe("@repo/ui/components");
    expect(pkg.exports["./components/*"]).toBe("./src/components/*.tsx");
    expect(own.aliases.hooks).toBe("@repo/ui/hooks");
    expect(pkg.exports["./hooks/*"]).toBe("./src/hooks/*.ts");
    expect(own.aliases.utils).toBe("@repo/ui/lib/utils");
    expect(pkg.exports["./lib/*"]).toBe("./src/lib/*.ts");
  });

  it("is the same in the website, so `shadcn add` from there lands in this package", () => {
    expect(website.aliases.ui).toBe(own.aliases.ui);
    expect(website.aliases.utils).toBe(own.aliases.utils);
    const css = path.join(
      root,
      "..",
      "..",
      "apps",
      "website",
      website.tailwind.css
    );
    expect(existsSync(css)).toBe(true);
    expect(path.resolve(css)).toBe(
      path.join(root, "src", "styles", "globals.css")
    );
  });
});

describe("globals.css", () => {
  const css = read("src/styles/globals.css");

  it("takes its colours and radius from @repo/config", () => {
    expect(css).toContain('@import "@repo/config/web.css"');
  });

  it("maps every colour in the shared theme to a Tailwind colour", () => {
    const missing = tokenNames.filter(
      (name) => !css.includes(`--color-${name}: var(--${name});`)
    );
    expect(missing).toEqual([]);
  });

  it("switches to dark with the `dark` class the ThemeProvider sets", () => {
    expect(css).toContain("@custom-variant dark (&:is(.dark *));");
  });
});

describe("cn", () => {
  it("joins class names and drops falsy ones", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });

  it("lets a later Tailwind class override an earlier conflicting one", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });
});
