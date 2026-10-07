import { Toaster } from "@repo/ui/components/sonner";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";

import "@repo/ui/globals.css";
import "./preview.css";

/*
 * Every story sits on the real theme from @repo/config (through @repo/ui's stylesheet) and can
 * be flipped between light and dark from the toolbar: the `dark` class on <html> is what the
 * web apps' ThemeProvider sets too.
 */
const preview: Preview = {
  decorators: [
    withThemeByClassName({
      defaultTheme: "light",
      themes: { dark: "dark", light: "" },
    }),
    (Story) => (
      <TooltipProvider>
        <div className="bg-background p-6 text-foreground">
          <Story />
        </div>
        <Toaster />
      </TooltipProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    layout: "centered",
  },
};

export default preview;
