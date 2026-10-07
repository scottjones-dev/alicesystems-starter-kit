"use client";

import Link from "fumadocs-core/link";
import { Card } from "fumadocs-ui/components/card";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
import { localizeHref } from "@/lib/localize-href";

/** A link in page content that stays in the reader's language. */
export function LocalizedAnchor(props: ComponentProps<"a">) {
  const { lang } = useParams<{ lang: string }>();

  return <Link {...props} href={localizeHref(props.href, lang) ?? ""} />;
}

/** A `<Card href="/docs/...">` in page content that stays in the reader's language. */
export function LocalizedCard(props: ComponentProps<typeof Card>) {
  const { lang } = useParams<{ lang: string }>();

  return <Card {...props} href={localizeHref(props.href, lang)} />;
}
