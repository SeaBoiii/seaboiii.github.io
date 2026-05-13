import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterReader from "@/components/ChapterReader";
import { ReaderPrefsBoot } from "@/components/ReaderSettings";
import { getNovel, getAllNovels } from "@/lib/novels";
import { allChapterParams, getChapter, getChapterList } from "@/lib/chapters";

export function generateStaticParams() {
  return allChapterParams();
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; chapter: string };
}): Promise<Metadata> {
  const novel = getNovel(params.slug);
  const ch = await getChapter(params.slug, params.chapter);
  if (!novel || !ch) return {};
  return {
    title: `${ch.label}: ${ch.title} · ${novel.title}`,
    description: `${novel.title} — ${ch.label}: ${ch.title}`,
  };
}

export default async function ChapterPage({
  params,
}: {
  params: { slug: string; chapter: string };
}) {
  const novel = getNovel(params.slug);
  if (!novel) notFound();
  const chapter = await getChapter(params.slug, params.chapter);
  if (!chapter) notFound();
  const chapters = getChapterList(params.slug);

  return (
    <>
      <ReaderPrefsBoot />
      <ChapterReader
        novelSlug={novel.slug}
        novelTitle={novel.title}
        chapter={chapter}
        chapters={chapters}
      />
    </>
  );
}

// Used by static export to know all valid pages.
export const dynamicParams = false;
