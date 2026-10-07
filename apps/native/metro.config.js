const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativewind } = require("nativewind/metro");

// The colour variable names, generated from packages/config/src/theme.ts.
const themeVariables = require("@repo/config/native-variables.json");

// Expo's default Metro config with Sentry's additions (a debug id in each bundle, so crash
// reports can be matched to source maps), plus NativeWind (Tailwind classes through `className`). The
// theme variables are kept out of compile-time inlining, so the ThemeProvider can switch light
// and dark at runtime.
module.exports = withNativewind(getSentryExpoConfig(__dirname), {
  inlineVariables: { exclude: themeVariables },
});
