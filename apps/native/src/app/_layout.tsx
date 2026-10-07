import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "../global.css";
import { ThemeProvider } from "../lib/theme-provider";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
