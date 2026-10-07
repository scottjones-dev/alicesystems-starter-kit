"use client";

import { Button } from "@repo/ui/components/button";
import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * What a visitor sees when the root layout itself fails to render. It replaces the whole page,
 * so it has to bring its own <html> and <body>. The error is sent to Sentry; the visitor sees
 * only a calm message, never the error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-semibold text-xl">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          We have been told about it. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </body>
    </html>
  );
}
