import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterReader from "@/components/ChapterReader";
import { ReaderPrefsBoot } from "@/components/ReaderSettings";
import { getNovel } from "@/lib/novels";
import {
  allChapterParams,
  getBranchChoicesAfter,
  getChapter,
  getChapterList,
} from "@/lib/chapters";

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const route = await params;
  const novel = getNovel(route.slug);
  const ch = await getChapter(route.slug, route.chapter);
  if (!novel || !ch) return {};
  return {
    title: `${ch.label}${ch.displayTitle ? `: ${ch.displayTitle}` : ""} · ${novel.title}`,
    description: `${novel.title} — ${ch.label}${ch.displayTitle ? `: ${ch.displayTitle}` : ""}`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const route = await params;
  const novel = getNovel(route.slug);
  if (!novel) notFound();
  const chapter = await getChapter(route.slug, route.chapter);
  if (!chapter) notFound();
  const chapters = getChapterList(route.slug);
  const branchChoices = chapter.next
    ? []
    : getBranchChoicesAfter(route.slug, route.chapter);

  return (
    <>
      <ReaderPrefsBoot />
      <ChapterReader
        novelSlug={novel.slug}
        novelTitle={novel.title}
        chapter={chapter}
        chapters={chapters}
        branchChoices={branchChoices}
      />
    </>
  );
}

// Used by static export to know all valid pages.
export const dynamicParams = false;
