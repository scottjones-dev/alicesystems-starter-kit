const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

// The colour variable names, generated from packages/config/src/theme.ts.
const themeVariables = require("@repo/config/native-variables.json");

// Expo's default Metro config, plus NativeWind (Tailwind classes through `className`). The
// theme variables are kept out of compile-time inlining, so the ThemeProvider can switch light
// and dark at runtime.
module.exports = withNativewind(getDefaultConfig(__dirname), {
  inlineVariables: { exclude: themeVariables },
});
