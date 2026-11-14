import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { StatusBadge } from "@/components/Badge";
import ContinueReadingButton from "@/components/ContinueReadingButton";
import ChapterDirectory from "@/components/ChapterDirectory";
import CoverImage from "@/components/CoverImage";
import Gallery from "@/components/Gallery";
import ResponsiveImage from "@/components/ResponsiveImage";
import { getAllNovels, getNovel, getNovelReadingSequence } from "@/lib/novels";
import { coverImageUrl } from "@/lib/images";
import { getChapterList } from "@/lib/chapters";
import type { Novel } from "@/types/novel";
import "@/styles/books.css";

export function generateStaticParams() {
  return getAllNovels().map((novel) => ({ slug: novel.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const novel = getNovel(params.slug);
  if (!novel) return { title: "Not found" };
  return {
    title: `${novel.title} · Aleem's Novels`,
    description: novel.blurb,
    openGraph: { title: novel.title, description: novel.blurb, images: [coverImageUrl(novel)] },
  };
}

function atmosphere(novel: Novel): string {
  const world = `${novel.genre?.join(" ")} ${novel.setting?.join(" ")}`;
  if (/fantasy|magic|myth|kingdom|crown/i.test(world)) return "184 143 89";
  if (/sci.?fi|cyber|speculative|dystopia|virtual/i.test(world)) return "121 153 170";
  if (/romance|love|heart/i.test(world)) return "164 127 143";
  return "143 147 184";
}

function readingDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ""}` : `${minutes} min`;
}

export default function NovelDetailPage({ params }: { params: { slug: string } }) {
  const novel = getNovel(params.slug);
  if (!novel) notFound();
  const chapters = getChapterList(novel.slug);
  const first = chapters[0];
  const mainCount = chapters.filter((chapter) => !chapter.isEpilogue).length;
  const epilogueCount = chapters.length - mainCount;
  const branches = chapters.filter((chapter) => chapter.epilogueType === "branching");
  const sequence = getNovelReadingSequence(novel);
  const seriesLabel = novel.seriesLabel === "secondskin" ? "Second Skin" : novel.seriesLabel;

  return (
    <>
      <Header crumbs={[{ label: "The library", href: "/novel/" }, { label: novel.title }]} />
      <main id="main" className="book-page" style={{ "--book-atmosphere": atmosphere(novel) } as CSSProperties}>
        <section className="book-introduction" aria-labelledby="book-title">
          <div className="book-cover-stage">
            <div className="book-cover-halo" aria-hidden="true" />
            <div className="book-cover-object">
              <CoverImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} priority sizes="(max-width: 640px) 65vw, (max-width: 1024px) 40vw, 420px" />
            </div>
            <p className="book-cover-caption">A story by Aleem</p>
          </div>
          <div className="book-introduction-copy">
            <div className="book-introduction-eyebrow">
              <span>{novel.genre?.[0] || "Fiction"}</span>
              <StatusBadge status={novel.status} />
            </div>
            {seriesLabel && <p className="book-series-label"><a href="#reading-order">{seriesLabel}{novel.readingOrder ? ` · Book ${novel.readingOrder}` : " · Companion story"}</a></p>}
            <h1 id="book-title" className="book-title">{novel.title}</h1>
            <div className="book-facts">
              <div><strong>{mainCount}</strong><span>{mainCount === 1 ? "chapter" : "chapters"}{epilogueCount ? ` + ${epilogueCount} ${epilogueCount === 1 ? "epilogue" : "epilogues"}` : ""}</span></div>
              <div><strong>{readingDuration(novel.readingMinutes)}</strong><span>estimated reading time</span></div>
              <div><strong>{novel.wordCount.toLocaleString("en")}</strong><span>words{branches.length > 1 ? ", including all endings" : ""}</span></div>
            </div>
            <div className="book-introduction-actions">
              {first && <Link href={`/novel/${novel.slug}/${first.slug}/`} prefetch={false} className="novel-button">Start reading <span aria-hidden="true">↗</span></Link>}
              <ContinueReadingButton novelSlug={novel.slug} />
              <a href="#chapters" className="novel-link">Browse chapters <span aria-hidden="true">↓</span></a>
            </div>
            {novel.blurb && <div className="book-synopsis"><h2>The story</h2><p>{novel.blurb}</p></div>}
            {branches.length > 1 && <p className="book-ending-note"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M10 18V11M10 11 4 5m6 6 6-6M1 5h3V2m12 0v3h3" /></svg> Two paths through the ending. Choose yours after the final chapter.</p>}
          </div>
        </section>

        <section className="book-world" aria-label="Story themes and setting">
          <MetaList label="Genre" items={novel.genre} />
          <MetaList label="Mood & tone" items={novel.tone} />
          <MetaList label="Where it unfolds" items={novel.setting} />
        </section>

        <ChapterDirectory novelSlug={novel.slug} chapters={chapters} />

        {!!novel.gallery?.length && <Gallery items={novel.gallery} novelTitle={novel.title} />}

        {sequence.length > 1 && (
          <section className="book-reading-order" id="reading-order" aria-labelledby="reading-order-title">
            <div className="book-section-heading">
              <div><p className="book-section-kicker">Stories that belong together</p><h2 className="section-heading" id="reading-order-title">{seriesLabel || "The story continues"}</h2></div>
              <p>{sequence.some((book) => book.readingOrder !== undefined) ? "Suggested reading order. Companion stories can be explored alongside the main sequence." : "Begin with the original, then continue into its sequel."}</p>
            </div>
            <ol className="book-sequence-list">
              {sequence.map((book, index) => (
                <li key={book.slug}>
                  <Link href={`/novel/${book.slug}/`} prefetch={false} aria-current={book.slug === novel.slug ? "page" : undefined} className="book-sequence-link">
                    <div className="book-sequence-cover"><ResponsiveImage src={coverImageUrl(book)} alt="" width={320} height={480} sizes="(max-width: 640px) 36vw, 180px" /></div>
                    <div className="book-sequence-copy"><span>{book.readingOrder ? `Book ${book.readingOrder}` : book.seriesId ? "Companion story" : `Book ${index + 1}`}{book.slug === novel.slug ? " · You're here" : ""}</span><h3>{book.title}</h3>{book.relationType && <p>{book.relationType}</p>}</div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="book-page-footer"><p>One story is only the beginning.</p><Link href="/novel/" className="novel-link">Return to the library <span aria-hidden="true">↗</span></Link></footer>
      </main>
    </>
  );
}

function MetaList({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div><h2>{label}</h2><p>{items.join(" · ")}</p></div>;
}

export const dynamicParams = false;
