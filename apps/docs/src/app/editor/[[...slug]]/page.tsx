import { readFile } from "node:fs/promises";
import { notFound } from "next/navigation";
import { DocEditor } from "@/components/doc-editor";
import { editorEnabled, resolveDocPath } from "@/lib/editor-files";

// Dev-only visual editor: /editor/editor edits content/docs/editor.mdx, /editor edits index.mdx.
export default async function EditorPage({
  params,
}: PageProps<"/editor/[[...slug]]">) {
  const { slug = [] } = await params;
  const file = editorEnabled ? resolveDocPath(slug) : null;
  if (!file) {
    notFound();
  }

  const source = await readFile(file, "utf8").catch(() => null);
  if (source === null) {
    notFound();
  }

  return <DocEditor slug={slug} source={source} />;
}
