import { contrastRatio, TEXT_CONTRAST } from "@repo/config/contrast";
import type { ColorScheme } from "@repo/config/theme";
import { theme } from "@repo/config/theme";
import { describe, expect, it } from "vitest";

import { colors, colorsFor, EMAIL_COLOR_SCHEME, stylesFor } from "./styles";

const schemes: ColorScheme[] = ["light", "dark"];

/** [text colour, what it sits on]: every pair an email draws. */
const pairs = (c: ReturnType<typeof colorsFor>): [string, string, string][] => [
  ["text on page", c.text, c.background],
  ["text on card", c.text, c.card],
  ["muted text on page", c.muted, c.background],
  ["muted text on card", c.muted, c.card],
  ["button text on button", c.primaryText, c.primary],
  ["link on card", c.primary, c.card],
  ["warning on card", c.destructive, c.card],
];

describe("the email palette", () => {
  it("uses the light theme for now", () => {
    expect(EMAIL_COLOR_SCHEME).toBe("light");
    expect(colors).toEqual(colorsFor("light"));
  });

  it("comes straight from the config theme", () => {
    for (const scheme of schemes) {
      const palette = theme.colors[scheme];
      expect(colorsFor(scheme)).toEqual({
        background: palette.background,
        border: palette.border,
        card: palette.card,
        destructive: palette.destructive,
        muted: palette["muted-foreground"],
        primary: palette.primary,
        primaryText: palette["primary-foreground"],
        text: palette.foreground,
      });
    }
  });

  it("keeps every pair readable (4.5:1) in BOTH themes, so switching is safe", () => {
    const tooLow = schemes.flatMap((scheme) =>
      pairs(colorsFor(scheme))
        .map(([name, foreground, background]) => ({
          name: `${scheme}: ${name}`,
          ratio: contrastRatio(foreground, background),
        }))
        .filter(({ ratio }) => ratio < TEXT_CONTRAST)
    );
    expect(tooLow).toEqual([]);
  });

  it("restyles every email when the theme is switched", () => {
    const light = stylesFor(colorsFor("light"));
    const dark = stylesFor(colorsFor("dark"));
    expect(light.body.backgroundColor).toBe(theme.colors.light.background);
    expect(dark.body.backgroundColor).toBe(theme.colors.dark.background);
    expect(dark.button.backgroundColor).toBe(theme.colors.dark.primary);
  });
});
