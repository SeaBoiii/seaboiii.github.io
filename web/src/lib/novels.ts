import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NOVELS_ROOT, RELATIONSHIPS_PATH, splitCsv } from "./paths";
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

function chaptersForSlug(slug: string): number {
  const dir = path.join(NOVELS_ROOT, slug);
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((f) => /^Chapter\d+\.md$/i.test(f) || /^Epilogue.*\.md$/i.test(f))
    .length;
}

export function getAllNovels(): Novel[] {
  if (cache) return cache;
  const relationships = readRelationships();
  const slugs = listNovelSlugs();

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
      chapterCount: chaptersForSlug(slug),
    };
  });

  novels.sort((a, b) => a.title.localeCompare(b.title));
  cache = novels;
  return novels;
}

export function getNovel(slug: string): Novel | undefined {
  return getAllNovels().find((n) => n.slug === slug);
}
