import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";
import { type NextRequest, NextResponse } from "next/server";
import { i18n } from "@/lib/i18n";
import { docsContentRoute, docsRoute } from "@/lib/shared";

const { rewrite: rewriteDocs } = rewritePath(
  `/:lang${docsRoute}{/*path}`,
  `/:lang${docsContentRoute}{/*path}/content.md`
);
const { rewrite: rewriteSuffix } = rewritePath(
  `/:lang${docsRoute}{/*path}.md`,
  `/:lang${docsContentRoute}{/*path}/content.md`
);

// Sends a URL with no language (`/docs/x`) to one with it (`/en/docs/x`).
const redirectToLanguage = createI18nMiddleware(i18n);

export default function proxy(
  request: NextRequest,
  event: Parameters<typeof redirectToLanguage>[1]
) {
  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const docsResult = rewriteDocs(request.nextUrl.pathname);

    if (docsResult) {
      return NextResponse.rewrite(new URL(docsResult, request.nextUrl), {
        // this URL has two representations, selected by `Accept`
        headers: { Vary: "Accept" },
      });
    }
  }

  return redirectToLanguage(request, event);
}

export const config = {
  // Skip the search API, Next.js internals and the root files (llms, robots, sitemap) that have
  // no language.
  matcher: ["/((?!api|_next|llms|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)"],
};
