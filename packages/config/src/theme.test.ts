import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { contrastRatio, GRAPHIC_CONTRAST, TEXT_CONTRAST } from "./contrast";
import type { ColorScheme, TokenName } from "./theme";
import { cssVariables, theme, themeVariableNames, tokenNames } from "./theme";
import { webThemeCss } from "./theme-css";
import { generatedFiles } from "./theme-files";

const schemes: ColorScheme[] = ["light", "dark"];
const HEX_COLOR = /^#[\da-f]{6}$/u;

/** [text colour, what it sits on]: every pair a screen actually draws. */
const textPairs: [TokenName, TokenName][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["accent-foreground", "accent"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  // Used as text colours: links and error messages on the page.
  ["primary", "background"],
  ["destructive", "background"],
];

/** Colours that are drawn as shapes, not read as text. */
const graphicPairs: [TokenName, TokenName][] = [
  ["input", "background"],
  ["ring", "background"],
  ["chart-1", "background"],
  ["chart-2", "background"],
  ["chart-3", "background"],
  ["chart-4", "background"],
  ["chart-5", "background"],
];

describe("the theme", () => {
  it("has a #rrggbb value for every token in both light and dark", () => {
    for (const scheme of schemes) {
      for (const name of tokenNames) {
        expect(theme.colors[scheme][name], `${scheme} ${name}`).toMatch(
          HEX_COLOR
        );
      }
    }
  });

  it("has exactly the tokens in tokenNames, nothing more", () => {
    for (const scheme of schemes) {
      expect(Object.keys(theme.colors[scheme]).toSorted()).toEqual(
        [...tokenNames].toSorted()
      );
    }
  });

  it("keeps every text pair readable (WCAG AA, 4.5:1) in both schemes", () => {
    const tooLow = schemes.flatMap((scheme) =>
      textPairs
        .map(([text, surface]) => ({
          ratio: contrastRatio(
            theme.colors[scheme][text],
            theme.colors[scheme][surface]
          ),
          text: `${scheme}: ${text} on ${surface}`,
        }))
        .filter(({ ratio }) => ratio < TEXT_CONTRAST)
    );
    expect(tooLow).toEqual([]);
  });

  it("keeps controls and chart colours visible (3:1) in both schemes", () => {
    const tooLow = schemes.flatMap((scheme) =>
      graphicPairs
        .map(([graphic, surface]) => ({
          ratio: contrastRatio(
            theme.colors[scheme][graphic],
            theme.colors[scheme][surface]
          ),
          text: `${scheme}: ${graphic} on ${surface}`,
        }))
        .filter(({ ratio }) => ratio < GRAPHIC_CONTRAST)
    );
    expect(tooLow).toEqual([]);
  });

  it("gives the native app one CSS variable per token", () => {
    expect(themeVariableNames).toHaveLength(tokenNames.length);
    for (const scheme of schemes) {
      const variables = cssVariables(scheme);
      expect(Object.keys(variables)).toEqual(themeVariableNames);
      expect(variables["--color-primary"]).toBe(theme.colors[scheme].primary);
    }
  });
});

describe("the generated files", () => {
  it("are up to date (run `pnpm theme:generate` if this fails)", () => {
    for (const { content, file } of generatedFiles()) {
      expect(readFileSync(file, "utf-8"), file).toBe(content);
    }
  });

  it("put light in :root and dark under .dark for the website", () => {
    const web = webThemeCss();
    expect(web).toContain(
      `:root {\n  --background: ${theme.colors.light.background};`
    );
    expect(web).toContain(
      `.dark {\n  --background: ${theme.colors.dark.background};`
    );
    expect(web).toContain(`--radius: ${theme.radius};`);
  });
});
