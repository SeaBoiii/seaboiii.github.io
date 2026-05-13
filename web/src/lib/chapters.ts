import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { NOVELS_ROOT } from "./paths";
import type { Chapter, ChapterMeta, EpilogueType } from "@/types/novel";

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

/** Strip leading "Chapter X -", "Chapter X:", "Epilogue [I-IV|A-Z]? [-:—–]" from a title */
function stripTitlePrefix(rawTitle: string): string {
  let t = rawTitle.trim();
  // "Chapter 29 - " / "Chapter 29: "
  t = t.replace(/^Chapter\s+\d+\s*[-:–—]+\s*/i, "");
  // "Epilogue" / "Epilogue I" / "Epilogue A" / "Epilogue 1" followed by separator
  t = t.replace(/^Epilogue(?:\s+(?:[IVX]+|[A-Z]|\d+))?\s*[-:–—]+\s*/i, "");
  // bare "Epilogue:" with no rest left → keep something readable
  if (!t || /^epilogue$/i.test(t)) t = rawTitle.trim();
  return t;
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

/** Detect whether a raw title indicates a sequential or branching epilogue. */
function parseEpilogueMarker(
  rawTitle: string,
): { type: EpilogueType; key: string } {
  const t = rawTitle.trim();
  if (!/epilogue/i.test(t)) return { type: "none", key: "" };
  // Branching: "Epilogue A ..." or "Epilogue B ..."
  const branch = t.match(/^Epilogue\s+([A-Z])\b/i);
  if (branch) return { type: "branching", key: branch[1].toUpperCase() };
  // Sequential roman: "Epilogue I" / "Epilogue II"
  const roman = t.match(/^Epilogue\s+([IVX]+)\b/i);
  if (roman) return { type: "sequential", key: roman[1].toUpperCase() };
  // Sequential arabic: "Epilogue 1" / "Epilogue 2"
  const num = t.match(/^Epilogue\s+(\d+)\b/);
  if (num) {
    const n = parseInt(num[1], 10);
    const r = Object.entries(ROMAN).find(([, v]) => v === n)?.[0] ?? num[1];
    return { type: "sequential", key: r };
  }
  return { type: "single", key: "" };
}

function buildMeta(
  novelSlug: string,
  fileBasename: string,
  rawTitle: string,
  order: number,
): ChapterMeta {
  const slug = fileBasename.replace(/\.md$/i, "");
  const ep = parseEpilogueMarker(rawTitle);
  const isEpilogue = ep.type !== "none";
  const displayTitle = isEpilogue ? stripTitlePrefix(rawTitle) : rawTitle.trim();

  let label: string;
  if (!isEpilogue) {
    label = `Chapter ${order}`;
  } else if (ep.type === "branching") {
    label = `Epilogue ${ep.key}`;
  } else if (ep.type === "sequential") {
    label = `Epilogue ${ep.key}`;
  } else {
    label = `Epilogue`;
  }

  return {
    novelSlug,
    slug,
    title: rawTitle.trim(),
    displayTitle,
    order,
    isEpilogue,
    epilogueType: ep.type,
    epilogueKey: ep.key,
    label,
  };
}

export function getChapterList(novelSlug: string): ChapterMeta[] {
  const dir = path.join(NOVELS_ROOT, novelSlug);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(isChapterFile);

  const metas: ChapterMeta[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data } = matter(raw);
    const order = typeof data.order === "number" ? data.order : 0;
    const title =
      (data.Title as string) || (data.title as string) || file.replace(/\.md$/i, "");
    return buildMeta(novelSlug, file, title, order);
  });

  // Stable sort by order — ensures sequential epilogues stay I → II → III
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
    (data.Title as string) || (data.title as string) || chapterSlug;

  const meta = buildMeta(novelSlug, `${chapterSlug}.md`, title, order);
  const html = String(await processor.process(content));

  const list = getChapterList(novelSlug);
  const idx = list.findIndex((c) => c.slug === chapterSlug);

  // Branching epilogues: collect siblings with same type but different key
  let branchSiblings: ChapterMeta[] | undefined;
  if (meta.epilogueType === "branching") {
    branchSiblings = list.filter(
      (c) => c.epilogueType === "branching" && c.slug !== chapterSlug,
    );
  }

  // For prev/next, treat all branching epilogues as parallel (skip cross-branch links)
  let prev: ChapterMeta | undefined;
  let next: ChapterMeta | undefined;

  if (meta.epilogueType === "branching") {
    // prev = last non-branching chapter before any branch
    for (let i = idx - 1; i >= 0; i--) {
      if (list[i].epilogueType !== "branching") {
        prev = list[i];
        break;
      }
    }
    // no "next" inside a branch — reader is at an ending
    next = undefined;
  } else {
    // For non-branching: skip over branching epilogues for next link
    if (idx > 0) prev = list[idx - 1];
    for (let i = idx + 1; i < list.length; i++) {
      if (list[i].epilogueType !== "branching") {
        next = list[i];
        break;
      }
      // If we hit branching epilogues immediately after this chapter, stop —
      // the chapter UI will show a "choose ending" picker instead.
      next = undefined;
      break;
    }
  }

  return { ...meta, html, prev, next, branchSiblings };
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

/**
 * For non-branching chapters, returns the branching epilogue choices that
 * appear immediately after this chapter (used to render a "choose ending" UI
 * at the bottom of the final non-branch chapter).
 */
export function getBranchChoicesAfter(
  novelSlug: string,
  chapterSlug: string,
): ChapterMeta[] {
  const list = getChapterList(novelSlug);
  const idx = list.findIndex((c) => c.slug === chapterSlug);
  if (idx === -1) return [];
  const choices: ChapterMeta[] = [];
  for (let i = idx + 1; i < list.length; i++) {
    if (list[i].epilogueType === "branching") choices.push(list[i]);
    else break;
  }
  return choices;
}
