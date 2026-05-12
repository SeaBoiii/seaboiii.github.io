import path from "node:path";

// Markdown source lives outside the Next app, at the repo root /novel folder.
export const NOVELS_ROOT = path.resolve(process.cwd(), "..", "novel");
export const RELATIONSHIPS_PATH = path.resolve(
  process.cwd(),
  "..",
  "tools",
  "novel_relationships.json",
);

export function splitCsv(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
