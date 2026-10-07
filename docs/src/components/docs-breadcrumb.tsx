"use client";

import { getBreadcrumbItemsFromPath } from "fumadocs-core/breadcrumb";
import Link from "fumadocs-core/link";
import { useTreeContext, useTreePath } from "fumadocs-ui/contexts/tree";
import { ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";
import { Fragment, useMemo } from "react";
import { docsRoute } from "@/lib/shared";

/**
 * The breadcrumb above a docs page: "Docs > Packages". Fumadocs' built-in one starts at the
 * first folder, so this adds a link back to the docs home. The page itself is left out because
 * its title is shown right below. Nothing is shown on the docs home, where there is no path.
 */
export function DocsBreadcrumb() {
  const path = useTreePath();
  const { root } = useTreeContext();
  const { lang } = useParams<{ lang: string }>();

  const folders = useMemo(
    () => getBreadcrumbItemsFromPath(root, path, { includePage: false }),
    [path, root]
  );

  if (folders.length === 0) {
    return null;
  }

  const items = [{ name: "Docs", url: `/${lang}${docsRoute}` }, ...folders];

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-fd-muted-foreground text-sm"
    >
      {items.map((item, index) => (
        <Fragment key={`${item.name}-${item.url ?? index}`}>
          {index > 0 && <ChevronRight className="size-3.5 shrink-0" />}
          {item.url ? (
            <Link
              className="truncate transition-colors hover:text-fd-foreground"
              href={item.url}
            >
              {item.name}
            </Link>
          ) : (
            <span className="truncate">{item.name}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
