/*
 * The colours of the whole product, defined once, in light and dark. The website's and the
 * native app's stylesheets are generated from this file (`pnpm theme:generate`), the native
 * app switches between light and dark with it at runtime, and emails read it too. To change
 * a colour, edit it here and run the generator. Tests fail if a generated file is out of
 * date or if a text pair stops being readable.
 *
 * The palette below is a neutral placeholder (slate with a blue primary): each platform
 * replaces it with its own brand colours.
 */

/** The semantic colour names. They are the shadcn/ui names, used as bg-primary, text-muted-foreground... */
export const tokenNames = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
] as const;

export type TokenName = (typeof tokenNames)[number];
export type ThemeColors = Record<TokenName, string>;
export type ColorScheme = "dark" | "light";

const light = {
  accent: "#e2e8f0",
  "accent-foreground": "#0f172a",
  background: "#fafafa",
  border: "#cbd5e1",
  card: "#ffffff",
  "card-foreground": "#0f172a",
  "chart-1": "#1d4ed8",
  "chart-2": "#0e7490",
  "chart-3": "#15803d",
  "chart-4": "#7c3aed",
  "chart-5": "#be123c",
  destructive: "#b91c1c",
  foreground: "#0f172a",
  input: "#64748b",
  muted: "#f1f5f9",
  "muted-foreground": "#475569",
  popover: "#ffffff",
  "popover-foreground": "#0f172a",
  primary: "#1d4ed8",
  "primary-foreground": "#ffffff",
  ring: "#1d4ed8",
  secondary: "#f1f5f9",
  "secondary-foreground": "#0f172a",
  sidebar: "#f1f5f9",
  "sidebar-accent": "#e2e8f0",
  "sidebar-accent-foreground": "#0f172a",
  "sidebar-border": "#cbd5e1",
  "sidebar-foreground": "#0f172a",
  "sidebar-primary": "#1d4ed8",
  "sidebar-primary-foreground": "#ffffff",
  "sidebar-ring": "#1d4ed8",
} as const satisfies ThemeColors;

const dark = {
  accent: "#334155",
  "accent-foreground": "#f1f5f9",
  background: "#020617",
  border: "#334155",
  card: "#0f172a",
  "card-foreground": "#e2e8f0",
  "chart-1": "#60a5fa",
  "chart-2": "#22d3ee",
  "chart-3": "#4ade80",
  "chart-4": "#a78bfa",
  "chart-5": "#fb7185",
  destructive: "#f87171",
  foreground: "#e2e8f0",
  input: "#64748b",
  muted: "#1e293b",
  "muted-foreground": "#94a3b8",
  popover: "#0f172a",
  "popover-foreground": "#e2e8f0",
  primary: "#60a5fa",
  "primary-foreground": "#020617",
  ring: "#60a5fa",
  secondary: "#1e293b",
  "secondary-foreground": "#e2e8f0",
  sidebar: "#0f172a",
  "sidebar-accent": "#1e293b",
  "sidebar-accent-foreground": "#e2e8f0",
  "sidebar-border": "#334155",
  "sidebar-foreground": "#e2e8f0",
  "sidebar-primary": "#60a5fa",
  "sidebar-primary-foreground": "#020617",
  "sidebar-ring": "#60a5fa",
} as const satisfies ThemeColors;

export const theme = {
  colors: { dark, light },
  /** Corner radius for the website's components. The app picks its own per component. */
  radius: "0.5rem",
} as const;

/**
 * The colours as CSS variables, for the native app: `{ "--color-background": "#fafafa", ... }`.
 * Nativewind switches between light and dark by providing one of these at runtime.
 */
export const cssVariables = (scheme: ColorScheme) =>
  Object.fromEntries(
    tokenNames.map((name) => [`--color-${name}`, theme.colors[scheme][name]])
  );

/** The names of those variables. The native app's Metro config keeps them out of compile-time inlining. */
export const themeVariableNames = tokenNames.map(
  (name) => `--color-${name}` as const
);
