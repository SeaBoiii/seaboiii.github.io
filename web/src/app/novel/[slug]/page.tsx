import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { StatusBadge } from "@/components/Badge";
import ContinueReadingButton from "@/components/ContinueReadingButton";
import CoverImage from "@/components/CoverImage";
import Gallery from "@/components/Gallery";
import { seriesAccentClass } from "@/components/seriesAccent";
import { getAllNovels, getNovel } from "@/lib/novels";
import { coverImageUrl } from "@/lib/images";
import { getChapterList } from "@/lib/chapters";
import type { ChapterMeta } from "@/types/novel";

export function generateStaticParams() {
  return getAllNovels().map((n) => ({ slug: n.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const novel = getNovel(params.slug);
  if (!novel) return { title: "Not found" };
  return {
    title: `${novel.title} · Aleem's Novels`,
    description: novel.blurb,
    openGraph: {
      title: novel.title,
      description: novel.blurb,
      images: [coverImageUrl(novel)],
    },
  };
}

export default function NovelDetailPage({ params }: { params: { slug: string } }) {
  const novel = getNovel(params.slug);
  if (!novel) notFound();

  const chapters = getChapterList(params.slug);
  const first = chapters[0];
  const accent = novel.seriesId ? seriesAccentClass(novel.seriesId) : null;

  // Group branching epilogues so we render a "Choose your ending" block.
  const branches = chapters.filter((c) => c.epilogueType === "branching");
  const nonBranchBeforeEnding = (() => {
    if (branches.length === 0) return null;
    const firstBranchIdx = chapters.findIndex((c) => c.epilogueType === "branching");
    return firstBranchIdx > 0 ? chapters[firstBranchIdx - 1] : null;
  })();

  return (
    <>
      <Header
        crumbs={[
          { label: "All Novels", href: "/novel/" },
          { label: novel.title },
        ]}
      />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Hero */}
        <section className="grid gap-8 sm:grid-cols-[200px_1fr] lg:grid-cols-[260px_1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-[260px] sm:mx-0">
            <CoverImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} />
          </div>
          <div className="flex flex-col gap-4">
            {novel.seriesLabel && (
              <p
                className={
                  "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] " +
                  (accent
                    ? accent.chip
                    : "border-accent/40 bg-accent-soft text-accent-strong")
                }
              >
                {accent && (
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden />
                )}
                {novel.seriesLabel}
                {novel.relationType ? ` · ${novel.relationType}` : ""}
              </p>
            )}
            <h1 className="font-display text-3xl font-semibold leading-tight text-text sm:text-5xl">
              {novel.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={novel.status} />
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-muted">
                {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
              </span>
              {branches.length > 1 && (
                <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                  {branches.length} alternate endings
                </span>
              )}
            </div>
            {novel.blurb && (
              <p className="max-w-prose text-base leading-relaxed text-text/90">{novel.blurb}</p>
            )}

            <dl className="grid grid-cols-1 gap-3 pt-2 text-sm sm:grid-cols-3">
              <MetaList label="Genre" items={novel.genre} />
              <MetaList label="Tone" items={novel.tone} />
              <MetaList label="Setting" items={novel.setting} />
            </dl>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              {first && (
                <Link
                  href={`/novel/${novel.slug}/${first.slug}/`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-card transition hover:bg-accent-strong"
                >
                  Start reading
                  <span aria-hidden>→</span>
                </Link>
              )}
              <ContinueReadingButton novelSlug={novel.slug} />
            </div>
          </div>
        </section>

        {/* Chapter list */}
        <section id="chapters" className="mt-14">
          <h2 className="mb-4 font-display text-2xl font-semibold text-text">Chapters</h2>
          {chapters.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-muted">
              No chapters published yet.
            </p>
          ) : (
            <ol className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              {chapters.map((c, i) => {
                // If this is the chapter just before branching epilogues, render a special divider after.
                const isPivot =
                  branches.length > 0 &&
                  nonBranchBeforeEnding?.slug === c.slug;
                const branchHere =
                  branches.length > 0 &&
                  c.epilogueType === "branching" &&
                  branches[0].slug === c.slug;
                return (
                  <li key={c.slug}>
                    {branchHere && (
                      <BranchPicker novelSlug={novel.slug} branches={branches} />
                    )}
                    {!branchHere && (
                      <ChapterRow novelSlug={novel.slug} chapter={c} first={i === 0} />
                    )}
                    {isPivot && branches.length > 0 && (
                      <div className="border-t border-border bg-accent-soft/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong sm:px-5">
                        — Choose your ending below —
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {novel.gallery && novel.gallery.length > 0 && (
          <Gallery items={novel.gallery} novelTitle={novel.title} />
        )}
      </main>
    </>
  );
}

function ChapterRow({
  novelSlug,
  chapter,
  first,
}: {
  novelSlug: string;
  chapter: ChapterMeta;
  first: boolean;
}) {
  return (
    <Link
      href={`/novel/${novelSlug}/${chapter.slug}/`}
      className={
        "flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-surface-2 sm:px-5 " +
        (first ? "" : "border-t border-border")
      }
    >
      <div className="flex min-w-0 items-baseline gap-3">
        <span
          className={
            "w-14 shrink-0 text-center text-[11px] font-semibold uppercase tracking-wide " +
            (chapter.isEpilogue ? "text-accent-strong" : "text-muted")
          }
        >
          {chapter.label}
        </span>
        <span className="truncate text-sm font-medium text-text sm:text-base">
          {chapter.displayTitle}
        </span>
      </div>
      <span aria-hidden className="text-muted">
        →
      </span>
    </Link>
  );
}

function BranchPicker({
  novelSlug,
  branches,
}: {
  novelSlug: string;
  branches: ChapterMeta[];
}) {
  return (
    <div className="border-t border-border bg-accent-soft/40 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">
        Choose your ending
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {branches.map((b) => (
          <Link
            key={b.slug}
            href={`/novel/${novelSlug}/${b.slug}/`}
            className="group flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-soft"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent-strong">
              Ending {b.epilogueKey}
            </span>
            <span className="font-display text-base font-semibold text-text group-hover:text-accent-strong">
              {b.displayTitle}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MetaList({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className="rounded-full border border-border bg-bg-2 px-2 py-0.5 text-xs text-text"
          >
            {it}
          </span>
        ))}
      </dd>
    </div>
  );
}
