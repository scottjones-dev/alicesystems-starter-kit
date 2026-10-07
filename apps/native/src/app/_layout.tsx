import { wrap } from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentType } from "react";

import "../global.css";
import { initObservability } from "../lib/observability";
import { ThemeProvider } from "../lib/theme-provider";

// Before anything renders, so an error while starting up is reported too.
initObservability();

function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}

// `wrap` reports errors thrown while rendering and adds crash reporting for the whole app.
const ReportingRootLayout: ComponentType = wrap(RootLayout);

export default ReportingRootLayout;
