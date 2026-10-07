import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { NotFoundPage } from "@/components/not-found-page";
import { i18n } from "@/lib/i18n";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  robots: { index: false },
  title: "Page not found",
};

// A URL that matches no route skips the layouts, so this page sets up its own html and theme.
export default function GlobalNotFound() {
  return (
    <html
      className={inter.className}
      lang={i18n.defaultLanguage}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <NotFoundPage />
        </RootProvider>
      </body>
    </html>
  );
}
