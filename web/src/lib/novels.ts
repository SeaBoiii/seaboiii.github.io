import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NOVELS_ROOT, RELATIONSHIPS_PATH, splitCsv } from "./paths";
import { getChapterList } from "./chapters";
import type { GalleryItem, Novel, NovelRelationship } from "@/types/novel";

let cache: Novel[] | null = null;

function listNovelSlugs(): string[] {
  if (!fs.existsSync(NOVELS_ROOT)) return [];
  return fs
    .readdirSync(NOVELS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readRelationships(): Record<string, NovelRelationship> {
  try {
    const raw = fs.readFileSync(RELATIONSHIPS_PATH, "utf8");
    return JSON.parse(raw) as Record<string, NovelRelationship>;
  } catch {
    return {};
  }
}

function prettifySlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function chapterStats(slug: string): { count: number; wordCount: number; readingMinutes: number } {
  const chapters = getChapterList(slug);
  const wordCount = chapters.reduce((total, chapter) => total + chapter.wordCount, 0);
  return { count: chapters.length, wordCount, readingMinutes: Math.max(1, Math.ceil(wordCount / 220)) };
}

function readLegacyIndexOrder(): Map<string, number> {
  const order = new Map<string, number>();
  const legacyIndexPath = path.join(NOVELS_ROOT, "index.html");
  if (!fs.existsSync(legacyIndexPath)) return order;

  const html = fs.readFileSync(legacyIndexPath, "utf8");
  const hrefRegex = /href=["']\/novel\/([^"'\/]+)\/["']/gi;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = hrefRegex.exec(html)) !== null) {
    const slug = m[1].toLowerCase();
    if (!order.has(slug)) {
      order.set(slug, idx);
      idx += 1;
    }
  }
  return order;
}

export function getAllNovels(): Novel[] {
  if (cache) return cache;
  const relationships = readRelationships();
  const slugs = listNovelSlugs();
  const legacyOrder = readLegacyIndexOrder();

  const novels: Novel[] = slugs.map((slug) => {
    const indexPath = path.join(NOVELS_ROOT, slug, "index.md");
    let data: Record<string, unknown> = {};
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, "utf8");
      data = matter(raw).data as Record<string, unknown>;
    }

    const title =
      (data.Title as string) ||
      (data.title as string) ||
      prettifySlug(slug).replace(/ — Chapters$/i, "");
    const cleanTitle = title.replace(/\s*[—-]\s*Chapters\s*$/i, "").trim();

    const gallery = Array.isArray(data.gallery)
      ? (data.gallery as GalleryItem[]).filter((g) => g && g.url)
      : undefined;

    const rel = relationships[slug] ?? {};
    const stats = chapterStats(slug);

    return {
      slug,
      title: cleanTitle || prettifySlug(slug),
      status: (data.status as string) || "Incomplete",
      blurb: typeof data.blurb === "string" ? data.blurb.trim() : undefined,
      genre: splitCsv(data.genre),
      tone: splitCsv(data.tone),
      setting: splitCsv(data.setting),
      cover: typeof data.cover === "string" ? data.cover : undefined,
      gallery,
      order: typeof data.order === "number" ? data.order : 0,
      seriesId: rel.series_id,
      seriesLabel: rel.series_label,
      relationType: rel.relation_type,
      relatedTo: rel.related_to,
      readingOrder: rel.reading_order,
      chapterCount: stats.count,
      wordCount: stats.wordCount,
      readingMinutes: stats.readingMinutes,
    };
  });

  // Preserve the author's curated shelf order. File timestamps change on checkout
  // and cannot honestly represent publication dates.
  novels.sort((a, b) => {
    const ai = legacyOrder.get(a.slug.toLowerCase());
    const bi = legacyOrder.get(b.slug.toLowerCase());
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return a.order - b.order || a.title.localeCompare(b.title, "en") || a.slug.localeCompare(b.slug, "en");
  });
  cache = novels;
  return novels;
}

export function getNovel(slug: string): Novel | undefined {
  return getAllNovels().find((n) => n.slug === slug);
}

/** Explicit reading order takes priority; companion stories follow the main sequence. */
export function getNovelReadingSequence(novel: Novel): Novel[] {
  const all = getAllNovels();
  let sequence: Novel[];
  if (novel.seriesId) {
    sequence = all.filter((book) => book.seriesId === novel.seriesId);
  } else {
    const connected = new Set([novel.slug]);
    let found = true;
    while (found) {
      found = false;
      for (const book of all) {
        if (book.relatedTo && (connected.has(book.slug) || connected.has(book.relatedTo))) {
          if (!connected.has(book.slug) || !connected.has(book.relatedTo)) found = true;
          connected.add(book.slug);
          connected.add(book.relatedTo);
        }
      }
    }
    sequence = all.filter((book) => connected.has(book.slug));
  }
  return sequence.sort((a, b) => {
    if (a.readingOrder !== undefined || b.readingOrder !== undefined) {
      return (a.readingOrder ?? Number.MAX_SAFE_INTEGER) - (b.readingOrder ?? Number.MAX_SAFE_INTEGER)
        || a.title.localeCompare(b.title, "en");
    }
    if (a.relatedTo === b.slug) return 1;
    if (b.relatedTo === a.slug) return -1;
    return a.title.localeCompare(b.title, "en");
  });
}
