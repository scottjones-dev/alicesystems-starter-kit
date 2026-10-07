import { app } from "@repo/config/app";
import { ThemeProvider } from "@repo/ui/providers/theme-provider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceStatus } from "../components/service-status";
import "@repo/ui/globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: app.description,
  title: { default: app.name, template: `%s | ${app.name}` },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} h-full font-sans antialiased`}
      lang={app.i18n.defaultLocale}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          <footer className="mx-auto flex w-full max-w-3xl px-6 py-6">
            <ServiceStatus />
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
