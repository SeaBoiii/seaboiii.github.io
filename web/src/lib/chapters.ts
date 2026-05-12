import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { NOVELS_ROOT } from "./paths";
import type { Chapter, ChapterMeta } from "@/types/novel";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true });

function isChapterFile(file: string): boolean {
  if (!file.endsWith(".md")) return false;
  if (file === "index.md") return false;
  return /^Chapter\d+\.md$/i.test(file) || /^Epilogue.*\.md$/i.test(file);
}

function buildLabel(title: string, order: number): { label: string; isEpilogue: boolean } {
  const lower = title.toLowerCase();
  if (lower.includes("epilogue")) {
    return { label: "Epilogue", isEpilogue: true };
  }
  return { label: `Chapter ${order}`, isEpilogue: false };
}

export function getChapterList(novelSlug: string): ChapterMeta[] {
  const dir = path.join(NOVELS_ROOT, novelSlug);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(isChapterFile);

  const metas: ChapterMeta[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data } = matter(raw);
    const slug = file.replace(/\.md$/i, "");
    const order = typeof data.order === "number" ? data.order : 0;
    const title =
      (data.Title as string) || (data.title as string) || slug.replace(/([A-Z])/g, " $1").trim();
    const { label, isEpilogue } = buildLabel(title, order);
    return {
      novelSlug,
      slug,
      title: title.trim(),
      order,
      isEpilogue,
      label,
    };
  });

  metas.sort((a, b) => a.order - b.order);
  return metas;
}

export async function getChapter(
  novelSlug: string,
  chapterSlug: string,
): Promise<Chapter | undefined> {
  const file = path.join(NOVELS_ROOT, novelSlug, `${chapterSlug}.md`);
  if (!fs.existsSync(file)) return undefined;

  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const order = typeof data.order === "number" ? data.order : 0;
  const title =
    (data.Title as string) ||
    (data.title as string) ||
    chapterSlug.replace(/([A-Z])/g, " $1").trim();
  const { label, isEpilogue } = buildLabel(title, order);

  const html = String(await processor.process(content));

  const list = getChapterList(novelSlug);
  const idx = list.findIndex((c) => c.slug === chapterSlug);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;

  return {
    novelSlug,
    slug: chapterSlug,
    title: title.trim(),
    order,
    isEpilogue,
    label,
    html,
    prev,
    next,
  };
}

export function allChapterParams(): { slug: string; chapter: string }[] {
  const dir = NOVELS_ROOT;
  if (!fs.existsSync(dir)) return [];
  const novels = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const out: { slug: string; chapter: string }[] = [];
  for (const n of novels) {
    for (const ch of getChapterList(n.name)) {
      out.push({ slug: n.name, chapter: ch.slug });
    }
  }
  return out;
}
