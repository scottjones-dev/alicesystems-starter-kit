import path from "node:path";

export const contentRoot = path.resolve(process.cwd(), "content/docs");

const MDX_EXTENSION = ".mdx";

/**
 * Turns URL segments (`["guides", "setup"]`) into an absolute `.mdx` path inside
 * `content/docs`. Returns null for anything that could leave that folder, so the editor
 * can never be pointed at other files on disk.
 */
export function resolveDocPath(segments: string[]): string | null {
  const relative = segments.length > 0 ? segments.join("/") : "index";
  const target = path.resolve(contentRoot, `${relative}${MDX_EXTENSION}`);
  const insideRoot = target.startsWith(`${contentRoot}${path.sep}`);

  return insideRoot ? target : null;
}

/** The editor writes files, so it only exists while developing. */
export const editorEnabled = process.env.NODE_ENV !== "production";
