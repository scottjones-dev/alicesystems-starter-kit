"use client";

import { MdxEditor } from "@fumadocs-editor/ui";
import { useCallback } from "react";

interface DocEditorProps {
  slug: string[];
  source: string;
}

// `MdxEditor` is a client component, so it is mounted from this file. It starts from the file's
// text and posts each debounced change to /api/editor, which writes it back to disk.
export function DocEditor({ slug, source }: DocEditorProps) {
  const save = useCallback(
    async (markdown: string) => {
      await fetch("/api/editor", {
        body: JSON.stringify({ markdown, slug }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
    },
    [slug]
  );

  return <MdxEditor defaultValue={source} onChange={save} variant="page" />;
}
