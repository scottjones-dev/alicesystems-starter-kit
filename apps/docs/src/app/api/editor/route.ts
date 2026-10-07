import { writeFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { editorEnabled, resolveDocPath } from "@/lib/editor-files";

interface SaveBody {
  markdown: string;
  slug: string[];
}

function isSaveBody(value: unknown): value is SaveBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { markdown, slug } = value as Partial<SaveBody>;
  return (
    typeof markdown === "string" &&
    Array.isArray(slug) &&
    slug.every((part) => typeof part === "string")
  );
}

// Called by the editor on every (debounced) change; writes the MDX back to its file.
export async function PUT(request: Request) {
  if (!editorEnabled) {
    return new NextResponse(null, { status: 404 });
  }

  const body: unknown = await request.json();
  if (!isSaveBody(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const file = resolveDocPath(body.slug);
  if (!file) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  await writeFile(file, body.markdown, "utf8");
  return NextResponse.json({ ok: true });
}
