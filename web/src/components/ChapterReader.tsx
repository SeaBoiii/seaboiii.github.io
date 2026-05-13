"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReaderSettings from "./ReaderSettings";
import ThemeToggle from "./ThemeToggle";
import { saveBookmark } from "./ContinueReadingButton";
import type { Chapter, ChapterMeta } from "@/types/novel";

interface Props {
  novelSlug: string;
  novelTitle: string;
  chapter: Chapter;
  chapters: ChapterMeta[];
  branchChoices?: ChapterMeta[];
}

export default function ChapterReader({
  novelSlug,
  novelTitle,
  chapter,
  chapters,
  branchChoices = [],
}: Props) {
  const [progress, setProgress] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const lastScroll = useRef(0);
  const articleRef = useRef<HTMLElement>(null);

  // Persist bookmark on mount
  useEffect(() => {
    saveBookmark(novelSlug, {
      chapterSlug: chapter.slug,
      chapterLabel: chapter.label,
      chapterTitle: chapter.displayTitle,
      ts: Date.now(),
    });
  }, [novelSlug, chapter.slug, chapter.label, chapter.displayTitle]);

  // Reading progress + auto-hiding header
  useEffect(() => {
    function onScroll() {
      const article = articleRef.current;
      const y = window.scrollY;
      const docH =
        (article?.offsetHeight ?? document.body.scrollHeight) -
        window.innerHeight +
        (article?.offsetTop ?? 0);
      const pct = Math.max(0, Math.min(1, y / Math.max(1, docH))) * 100;
      setProgress(pct);

      if (y < 80) setHidden(false);
      else if (y > lastScroll.current + 8) setHidden(true);
      else if (y < lastScroll.current - 8) setHidden(false);
      lastScroll.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard nav: arrows + n / p
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "ArrowLeft" || e.key === "p") && chapter.prev) {
        window.location.href = `/novel/${novelSlug}/${chapter.prev.slug}/`;
      } else if ((e.key === "ArrowRight" || e.key === "n") && chapter.next) {
        window.location.href = `/novel/${novelSlug}/${chapter.next.slug}/`;
      } else if (e.key === "Escape") {
        setSettingsOpen(false);
        setTocOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [novelSlug, chapter.prev, chapter.next]);

  return (
    <>
      <div className="reading-progress" aria-hidden>
        <span style={{ ["--progress" as never]: `${progress}%` }} />
      </div>

      <header
        className="header-autohide sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur"
        data-hidden={hidden ? "true" : "false"}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/novel/"
              className="font-display text-base font-semibold text-text hover:text-accent-strong"
            >
              Aleem&apos;s Novels
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <Link
              href={`/novel/${novelSlug}/`}
              className="hidden max-w-[28ch] truncate text-sm text-muted hover:text-text sm:inline"
              title={novelTitle}
            >
              {novelTitle}
            </Link>
          </div>
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              aria-label="Chapter list"
              aria-expanded={tocOpen}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-surface px-3 text-xs font-medium text-text transition hover:bg-surface-2"
            >
              Chapters
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Reader settings"
              aria-expanded={settingsOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text transition hover:bg-surface-2"
            >
              <span className="font-display text-sm font-semibold">Aa</span>
            </button>
            <ThemeToggle />
            <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </div>
        </div>
      </header>

      {/* TOC drawer */}
      {tocOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-label="Chapter list"
          onClick={() => setTocOpen(false)}
        >
          <div className="flex-1 bg-black/40 backdrop-blur-sm" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[min(380px,90vw)] flex-col border-l border-border bg-surface shadow-soft"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-display text-base font-semibold text-text">{novelTitle}</p>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                aria-label="Close chapter list"
                className="rounded-md px-2 text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
            <ol className="flex-1 overflow-y-auto">
              {chapters.map((c) => {
                const active = c.slug === chapter.slug;
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/novel/${novelSlug}/${c.slug}/`}
                      onClick={() => setTocOpen(false)}
                      className={
                        "flex items-baseline gap-3 border-b border-border px-4 py-3 text-sm transition " +
                        (active
                          ? "bg-accent-soft text-accent-strong"
                          : "hover:bg-surface-2")
                      }
                    >
                      <span
                        className={
                          "w-24 shrink-0 whitespace-nowrap text-xs font-semibold uppercase tracking-wide " +
                          (c.isEpilogue ? "text-accent-strong" : "text-muted")
                        }
                      >
                        {c.label}
                      </span>
                      <span className="truncate font-medium">{c.displayTitle}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      )}

      <main className="mx-auto px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <article
          ref={articleRef}
          className="mx-auto"
          style={{ maxWidth: "var(--reader-max-width, 800px)" }}
        >
          <header className="mb-8 border-b border-border pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
              {chapter.label}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-text sm:text-4xl">
              {chapter.displayTitle}
            </h1>
            <p className="mt-2 text-sm text-muted">{novelTitle}</p>
            {chapter.epilogueType === "branching" &&
              chapter.branchSiblings &&
              chapter.branchSiblings.length > 0 && (
                <div className="mt-5 rounded-xl border border-accent/30 bg-accent-soft/60 px-4 py-3 text-sm text-accent-strong">
                  <p className="font-semibold">You’re reading ending {chapter.epilogueKey}.</p>
                  <p className="mt-1 text-accent-strong/90">
                    Alternative ending{chapter.branchSiblings.length > 1 ? "s" : ""} available:{" "}
                    {chapter.branchSiblings.map((s, i) => (
                      <span key={s.slug}>
                        {i > 0 && ", "}
                        <Link
                          href={`/novel/${novelSlug}/${s.slug}/`}
                          className="font-semibold underline underline-offset-2 hover:text-accent"
                        >
                          Ending {s.epilogueKey}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              )}
          </header>

          <div
            className="prose-reader"
            dangerouslySetInnerHTML={{ __html: chapter.html }}
          />

          {branchChoices.length > 1 && (
            <section className="mt-12 rounded-2xl border border-accent/40 bg-accent-soft/60 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-strong">
                Choose your ending
              </p>
              <p className="mt-2 text-sm text-text/90">
                This chapter branches into {branchChoices.length} alternate endings. Pick the one you'd like to read first — you can always return for the other.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {branchChoices.map((b) => (
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
            </section>
          )}

          <nav
            className="mt-16 flex flex-col gap-3 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Chapter navigation"
          >
            {chapter.prev ? (
              <Link
                href={`/novel/${novelSlug}/${chapter.prev.slug}/`}
                className="group inline-flex items-baseline gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-accent/50 hover:bg-surface-2"
              >
                <span aria-hidden className="text-muted group-hover:text-text">
                  ←
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Previous · {chapter.prev.label}
                  </span>
                  <span className="text-sm font-medium text-text">{chapter.prev.displayTitle}</span>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {chapter.next ? (
              <Link
                href={`/novel/${novelSlug}/${chapter.next.slug}/`}
                className="group inline-flex items-baseline gap-3 rounded-xl bg-accent px-4 py-3 text-right text-white transition hover:bg-accent-strong sm:flex-row-reverse"
              >
                <span aria-hidden>→</span>
                <span className="flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Next · {chapter.next.label}
                  </span>
                  <span className="text-sm font-medium">{chapter.next.displayTitle}</span>
                </span>
              </Link>
            ) : branchChoices.length <= 1 ? (
              <Link
                href={`/novel/${novelSlug}/`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text hover:bg-surface-2"
              >
                Back to novel
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </main>
    </>
  );
}
