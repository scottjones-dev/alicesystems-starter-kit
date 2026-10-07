import type { ColorScheme } from "@repo/config/theme";

/**
 * The theme to show for the device's setting: dark only when the device says dark, light
 * otherwise, including when it says nothing (this matches the light default in global.css).
 * Kept apart from the provider so it can be tested without loading React Native.
 */
export const schemeFor = (
  deviceScheme: string | null | undefined
): ColorScheme => (deviceScheme === "dark" ? "dark" : "light");
