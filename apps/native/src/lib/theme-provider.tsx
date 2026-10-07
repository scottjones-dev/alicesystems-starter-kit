import { cssVariables } from "@repo/config/theme";
import { VariableContextProvider } from "nativewind";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";

import { schemeFor } from "./scheme";

/**
 * Light and dark mode. The colours are CSS variables (see global.css); this swaps in the
 * light or dark values from the shared theme to match the device. Wrap the whole app in it.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <VariableContextProvider value={cssVariables(schemeFor(useColorScheme()))}>
    {children}
  </VariableContextProvider>
);
