"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { i18n } from "@/lib/i18n";

/**
 * The 404 page. Used inside the language layout (for a missing docs page) and on its own (for a
 * URL that matches no route, where there is no language to read, so it uses the default).
 */
export function NotFoundPage() {
  const params = useParams<{ lang?: string }>();
  const lang = params.lang ?? i18n.defaultLanguage;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-fd-muted-foreground text-sm">404</p>
      <h1 className="font-bold text-3xl tracking-tight">Page not found</h1>
      <p className="max-w-md text-fd-muted-foreground">
        That page does not exist, or it has moved. Try the docs home or search
        for what you were looking for.
      </p>
      <div className="flex gap-3">
        <Link
          className="rounded-md bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground text-sm transition-opacity hover:opacity-90"
          href={`/${lang}/docs`}
        >
          Docs home
        </Link>
        <Link
          className="rounded-md border px-5 py-2.5 font-medium text-sm transition-colors hover:bg-fd-accent"
          href={`/${lang}`}
        >
          Home
        </Link>
      </div>
    </main>
  );
}
