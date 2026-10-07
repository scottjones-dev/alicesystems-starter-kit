"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Light and dark mode for a web app: follows the device by default, remembers a choice, and
 * applies the `dark` class that globals.css and every component's `dark:` styles listen to.
 * Wrap the whole app in it, and put `suppressHydrationWarning` on `<html>`.
 */
export const ThemeProvider = ({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    disableTransitionOnChange
    enableSystem
    {...props}
  >
    {children}
  </NextThemesProvider>
);
