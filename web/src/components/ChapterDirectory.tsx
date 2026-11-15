"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadBookmark } from "@/components/ContinueReadingButton";
import { loadReadingState } from "@/lib/reader-state";
import type { ChapterMeta } from "@/types/novel";

export default function ChapterDirectory({ novelSlug, chapters }: { novelSlug: string; chapters: ChapterMeta[] }) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { progress: number; completed: boolean }>>({});

  useEffect(() => {
    function refresh() {
      const bookmark = loadBookmark(novelSlug);
      setCurrent(bookmark && chapters.some((chapter) => chapter.slug === bookmark.chapterSlug) ? bookmark.chapterSlug : null);
      setProgress(loadReadingState(novelSlug).chapters);
    }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("novel-reading-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("novel-reading-change", refresh);
    };
  }, [novelSlug, chapters]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en");
    return normalized ? chapters.filter((chapter) => `${chapter.label} ${chapter.displayTitle}`.toLocaleLowerCase("en").includes(normalized)) : chapters;
  }, [chapters, query]);
  const main = visible.filter((chapter) => !chapter.isEpilogue);
  const epilogues = visible.filter((chapter) => chapter.isEpilogue && chapter.epilogueType !== "branching");
  const branches = visible.filter((chapter) => chapter.epilogueType === "branching");

  return (
    <section className="chapter-directory" id="chapters" aria-labelledby="chapter-directory-title">
      <div className="book-section-heading">
        <div>
          <p className="book-section-kicker">Find your place</p>
          <h2 className="section-heading" id="chapter-directory-title">Inside the story</h2>
        </div>
        <div className="chapter-directory-search">
          <label htmlFor="chapter-search">Search chapters</label>
          <div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input id="chapter-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="A title or chapter number…" autoComplete="off" />
          </div>
        </div>
      </div>
      <p className="chapter-directory-count" aria-live="polite" role="status">
        {query.trim() ? `${visible.length} of ${chapters.length} sections` : "Every chapter, at your own pace."}
      </p>
      {main.length > 0 && <ChapterGroup title="Chapters" chapters={main} novelSlug={novelSlug} current={current} progress={progress} />}
      {epilogues.length > 0 && <ChapterGroup title={epilogues.length === 1 ? "Epilogue" : "Epilogues"} chapters={epilogues} novelSlug={novelSlug} current={current} progress={progress} description={epilogues.length > 1 ? "Continue through these closing chapters in order." : undefined} />}
      {branches.length > 0 && <ChapterGroup title="Alternate endings" chapters={branches} novelSlug={novelSlug} current={current} progress={progress} description="These endings are parallel. Choose one after the final chapter, or explore each." />}
      {chapters.length === 0 && <p className="chapter-directory-empty">No chapters published yet.</p>}
      {chapters.length > 0 && visible.length === 0 && (
        <div className="chapter-directory-empty">
          <p>No chapters match “{query}”.</p>
          <button type="button" className="novel-button-secondary" onClick={() => setQuery("")}>Clear search</button>
        </div>
      )}
      <noscript><p className="book-small-note">All chapters are listed here. Reading progress and chapter search become available with JavaScript.</p></noscript>
    </section>
  );
}

function ChapterGroup({ title, description, chapters: group, novelSlug, current, progress }: {
  title: string;
  description?: string;
  chapters: ChapterMeta[];
  novelSlug: string;
  current: string | null;
  progress: Record<string, { progress: number; completed: boolean }>;
}) {
    return (
      <div className="chapter-directory-group">
        <div className="chapter-directory-group-heading"><h3>{title}</h3>{description && <p>{description}</p>}</div>
        <ol className="chapter-directory-list">
          {group.map((chapter) => {
            const state = progress[chapter.slug];
            const isCurrent = current === chapter.slug;
            return (
              <li key={chapter.slug}>
                <Link href={`/novel/${novelSlug}/${chapter.slug}/`} prefetch={false} className="chapter-directory-row">
                  <span className="chapter-directory-label">{chapter.label}</span>
                  <span className="chapter-directory-name">{chapter.displayTitle || chapter.label}</span>
                  <span className="chapter-directory-state">
                    {isCurrent ? <span className="chapter-state-current">Your place</span> : state?.completed ? <span className="chapter-state-read">Read <span aria-hidden="true">✓</span></span> : state && state.progress > 0.02 ? <span>{Math.round(state.progress * 100)}%</span> : null}
                  </span>
                  <span className="chapter-directory-time">~{chapter.readingMinutes} min</span>
                  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
}
