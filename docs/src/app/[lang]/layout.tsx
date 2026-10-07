import { i18nProvider } from "fumadocs-ui/i18n";
import { RootProvider } from "fumadocs-ui/provider/next";
import "../global.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { i18n } from "@/lib/i18n";
import { translations } from "@/lib/layout.shared";
import { appName, siteDescription } from "@/lib/shared";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  description: siteDescription,
  metadataBase: getSiteUrl(),
  openGraph: { siteName: appName, type: "website" },
  title: { default: appName, template: `%s | ${appName}` },
  twitter: { card: "summary_large_image" },
};

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function Layout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  // A URL like /xx/docs has no such language: show the 404 page, not a broken page.
  if (!i18n.languages.some((known) => known === lang)) {
    notFound();
  }

  return (
    <html className={inter.className} lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider i18n={i18nProvider(translations, lang)}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
