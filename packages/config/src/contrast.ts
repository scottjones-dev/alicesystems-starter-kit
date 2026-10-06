/*
 * WCAG contrast between two #rrggbb colours. Used by this package's theme tests, and by
 * any package that builds its own palette from the theme (emails) to prove it stays readable.
 */

const HEX_COLOR = /^#[\da-f]{6}$/u;
const SRGB_THRESHOLD = 0.039_28;
const RED_WEIGHT = 0.2126;
const GREEN_WEIGHT = 0.7152;
const BLUE_WEIGHT = 0.0722;
const FLARE = 0.05;

/** Minimum contrast for normal text (WCAG AA). */
export const TEXT_CONTRAST = 4.5;
/** Minimum contrast for borders, icons and chart colours (WCAG AA for graphics). */
export const GRAPHIC_CONTRAST = 3;

const channel = (hex: string, index: number): number => {
  const value = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
  return value <= SRGB_THRESHOLD
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number =>
  RED_WEIGHT * channel(hex, 1) +
  GREEN_WEIGHT * channel(hex, 3) +
  BLUE_WEIGHT * channel(hex, 5);

/** Contrast ratio from 1 (identical) to 21 (black on white). Order does not matter. */
export const contrastRatio = (first: string, second: string): number => {
  for (const color of [first, second]) {
    if (!HEX_COLOR.test(color)) {
      throw new Error(`"${color}" is not a lowercase #rrggbb colour.`);
    }
  }
  const [lighter = 0, darker = 0] = [
    luminance(first),
    luminance(second),
  ].toSorted((a, b) => b - a);
  return (lighter + FLARE) / (darker + FLARE);
};
