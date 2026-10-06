import type { ColorScheme } from "@repo/config/theme";
import { theme } from "@repo/config/theme";
import type { CSSProperties } from "react";

/*
 * The look of every email, as plain inline styles: mail clients ignore most CSS, so there is
 * no stylesheet and no framework. The colours come from @repo/config, which has both a light
 * and a dark theme, so a platform changes its brand once, there.
 */

/**
 * Which theme the emails use. Emails have ONE look, set here: change this single line to
 * "dark" and every email, and the `color-scheme` meta that asks mail clients to leave it
 * alone, follows. (Switching with the reader's system setting would need a second palette
 * and a media query in every email; that is not built.)
 */
export const EMAIL_COLOR_SCHEME: ColorScheme = "light";

/** The handful of colours emails use, taken from one theme. */
export const colorsFor = (scheme: ColorScheme) => {
  const palette = theme.colors[scheme];
  return {
    background: palette.background,
    border: palette.border,
    card: palette.card,
    destructive: palette.destructive,
    muted: palette["muted-foreground"],
    primary: palette.primary,
    primaryText: palette["primary-foreground"],
    text: palette.foreground,
  } as const;
};

export type EmailColors = ReturnType<typeof colorsFor>;

const fontFamily =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';

/** Every style an email uses, built from one set of colours. */
export const stylesFor = (palette: EmailColors) =>
  ({
    body: {
      backgroundColor: palette.background,
      color: palette.text,
      fontFamily,
      margin: 0,
      padding: 0,
    },
    brand: {
      color: palette.text,
      fontSize: "16px",
      fontWeight: 600,
      margin: "0 0 16px",
    },
    button: {
      backgroundColor: palette.primary,
      borderRadius: "8px",
      color: palette.primaryText,
      display: "inline-block",
      fontSize: "15px",
      fontWeight: 600,
      padding: "12px 24px",
      textDecoration: "none",
    },
    card: {
      backgroundColor: palette.card,
      border: `1px solid ${palette.border}`,
      borderRadius: "12px",
      padding: "28px",
    },
    container: {
      margin: "0 auto",
      maxWidth: "560px",
      padding: "32px 16px",
    },
    footerLink: { color: palette.muted, textDecoration: "underline" },
    footerText: {
      color: palette.muted,
      fontSize: "13px",
      lineHeight: "20px",
      margin: "0 0 8px",
    },
    heading: {
      color: palette.text,
      fontSize: "22px",
      fontWeight: 600,
      margin: "0 0 16px",
    },
    paragraph: {
      color: palette.text,
      fontSize: "15px",
      lineHeight: "24px",
      margin: "0 0 16px",
    },
    small: {
      color: palette.muted,
      fontSize: "13px",
      lineHeight: "20px",
      margin: "16px 0 0",
    },
    url: {
      color: palette.primary,
      fontSize: "13px",
      lineHeight: "20px",
      margin: 0,
      wordBreak: "break-all",
    },
    warning: {
      color: palette.destructive,
      fontSize: "15px",
      fontWeight: 600,
      lineHeight: "24px",
      margin: "0 0 16px",
    },
  }) as const satisfies Record<string, CSSProperties>;

export const colors = colorsFor(EMAIL_COLOR_SCHEME);
export const styles = stylesFor(colors);
