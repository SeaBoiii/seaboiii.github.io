"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import NativeDialog from "./NativeDialog";
import ReaderSettings from "./ReaderSettings";
import {
  applyReaderPreferences, loadReaderPreferences,
  PREFERENCES_DID_CHANGE, PREFERENCES_WILL_CHANGE,
} from "@/lib/reader-preferences";
import {
  loadBookmark, loadReadingState, saveBookmark, saveReadingProgress, validateBookmark,
  type Bookmark, type ReadingState, READING_CHANGE_EVENT,
} from "@/lib/reader-state";
import type { Chapter, ChapterMeta } from "@/types/novel";
import "@/styles/reader.css";

interface Props {
  novelSlug: string;
  novelTitle: string;
  chapter: Chapter;
  chapters: ChapterMeta[];
  branchChoices?: ChapterMeta[];
}

interface HistoryEntry { id: string; novelSlug: string; chapterSlug: string }

const READING_LINE = 104;

function proseBlocks(prose: HTMLElement): HTMLElement[] {
  const blocks = Array.from(prose.querySelectorAll<HTMLElement>("p, h2, h3, h4, li, hr"));
  return blocks.length ? blocks : [prose];
}

function chapterProgress(prose: HTMLElement): number {
  const box = prose.getBoundingClientRect();
  const start = box.top + window.scrollY - READING_LINE;
  const travel = Math.max(1, box.height - window.innerHeight + READING_LINE + 60);
  return Math.max(0, Math.min(1, (window.scrollY - start) / travel));
}

function capturePosition(prose: HTMLElement, chapter: Chapter): Bookmark {
  const blocks = proseBlocks(prose);
  const progress = chapterProgress(prose);
  let paragraph = blocks.findIndex((block) => block.getBoundingClientRect().bottom > READING_LINE);
  if (paragraph < 0) paragraph = blocks.length - 1;
  const box = blocks[paragraph].getBoundingClientRect();
  return {
    version: 2,
    chapterSlug: chapter.slug,
    chapterLabel: chapter.label,
    chapterTitle: chapter.displayTitle,
    ts: Date.now(),
    progress,
    paragraph,
    offset: Math.max(0, Math.min(1, (READING_LINE - box.top) / Math.max(1, box.height))),
    completed: progress >= 0.98,
  };
}

function restorePosition(prose: HTMLElement, bookmark: Bookmark): void {
  if ((bookmark.progress ?? 0) <= 0 && (bookmark.paragraph ?? 0) === 0 && (bookmark.offset ?? 0) === 0) {
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  const blocks = proseBlocks(prose);
  if (bookmark.paragraph !== undefined && blocks[bookmark.paragraph]) {
    const box = blocks[bookmark.paragraph].getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top + box.height * (bookmark.offset ?? 0) - READING_LINE, behavior: "instant" });
  } else {
    const box = prose.getBoundingClientRect();
    const start = box.top + window.scrollY - READING_LINE;
    const travel = Math.max(1, box.height - window.innerHeight + READING_LINE + 60);
    window.scrollTo({ top: start + (bookmark.progress ?? 0) * travel, behavior: "instant" });
  }
}

/** Keep each browser history entry separate from the latest Continue Reading bookmark. */
function readingEntry(novelSlug: string, chapterSlug: string): { entry: HistoryEntry; returning: boolean } {
  const state = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
  const saved = state.__novelReader as HistoryEntry | undefined;
  if (saved?.novelSlug === novelSlug && saved.chapterSlug === chapterSlug && /^[a-z0-9-]+$/i.test(saved.id)) {
    return { entry: saved, returning: true };
  }
  const entry = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, novelSlug, chapterSlug };
  try { window.history.replaceState({ ...state, __novelReader: entry }, ""); } catch {}
  return { entry, returning: false };
}

function sessionPosition(entry: HistoryEntry): Bookmark | null {
  try { return validateBookmark(JSON.parse(sessionStorage.getItem(`reader-position:${entry.id}`) ?? "null")); }
  catch { return null; }
}

function isEditing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && !!target.closest("input, textarea, select, button, a, [contenteditable], [role='textbox']");
}

export default function ChapterReader({ novelSlug, novelTitle, chapter, chapters, branchChoices = [] }: Props) {
  const [progress, setProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [ready, setReady] = useState(false);
  const [readingState, setReadingState] = useState<ReadingState>({ version: 2, chapters: {} });
  const proseRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLElement>(null);
  const persistRef = useRef<() => void>(() => {});
  const focusModeRef = useRef(false);
  const dialogOpenRef = useRef(false);
  const pendingAnchorRef = useRef<Bookmark | null>(null);
  const restoreAfterDialogRef = useRef<() => void>(() => {});

  focusModeRef.current = focusMode;
  dialogOpenRef.current = tocOpen || settingsOpen;

  useEffect(() => {
    const prose = proseRef.current;
    if (!prose) return;
    const root = document.documentElement;
    applyReaderPreferences(loadReaderPreferences());
    setReady(true);
    setProgress(0);
    setResumed(false);
    setToolbarHidden(false);
    setTocOpen(false);
    setSettingsOpen(false);
    setQuery("");
    setReadingState(loadReadingState(novelSlug));
    const { entry, returning } = readingEntry(novelSlug, chapter.slug);
    let active = true;
    let leaving = false;
    let restoring = true;
    let raf = 0;
    let resizeTimer = 0;
    let saveTimer = 0;
    let noticeTimer = 0;
    let lastScroll = window.scrollY;
    let lastSaved = 0;
    let restoreToken = 0;
    let latest: Bookmark = {
      chapterSlug: chapter.slug, chapterLabel: chapter.label, chapterTitle: chapter.displayTitle,
      ts: Date.now(), progress: 0, paragraph: 0, offset: 0,
    };

    function persist(capture = true) {
      if (restoring) return;
      if (capture && !leaving && prose!.isConnected && !dialogOpenRef.current) latest = capturePosition(prose!, chapter);
      const bookmark = { ...latest, ts: Date.now() };
      saveBookmark(novelSlug, bookmark);
      saveReadingProgress(novelSlug, chapter.slug, {
        progress: bookmark.progress ?? 0, completed: bookmark.completed === true, ts: bookmark.ts,
      });
      try { sessionStorage.setItem(`reader-position:${entry.id}`, JSON.stringify(bookmark)); } catch {}
      lastSaved = Date.now();
    }
    // Freeze before Next removes route-specific CSS or resets the outgoing page scroll.
    persistRef.current = () => { persist(); leaving = true; };

    function update() {
      raf = 0;
      if (!active || leaving || restoring || dialogOpenRef.current ||
          window.location.pathname.replace(/\/$/, "") !== `/novel/${novelSlug}/${chapter.slug}`) return;
      latest = capturePosition(prose!, chapter);
      setProgress(latest.progress ?? 0);
      const y = window.scrollY;
      const focused = toolbarRef.current?.contains(document.activeElement);
      if (!focusModeRef.current || y < 160 || focused || y < lastScroll - 5) setToolbarHidden(false);
      else if (y > lastScroll + 5) setToolbarHidden(true);
      lastScroll = y;
      if (Date.now() - lastSaved > 1000) persist(false);
      else {
        window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => persist(false), 1050);
      }
    }
    function onScroll() { if (!raf) raf = window.requestAnimationFrame(update); }
    function onPageHide() { persist(); }
    function onPopState() {
      if (window.location.pathname.replace(/\/$/, "") !== `/novel/${novelSlug}/${chapter.slug}`) {
        persist(false);
        leaving = true;
      }
    }
    function onVisibility() { if (document.visibilityState === "hidden") persist(); }
    function cancelInitialRestore(event: Event) {
      if (dialogOpenRef.current) return;
      if (event.isTrusted && (event.type !== "keydown" || ["PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End", " "].includes((event as KeyboardEvent).key))) {
        restoring = false;
        pendingAnchorRef.current = null;
        restoreToken += 1;
        window.clearTimeout(resizeTimer);
      }
    }
    async function afterLayout() {
      if (document.fonts) await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    async function restoreAnchor() {
      const bookmark = pendingAnchorRef.current;
      if (!bookmark || dialogOpenRef.current) return;
      pendingAnchorRef.current = null;
      restoring = true;
      const token = ++restoreToken;
      await afterLayout();
      if (!active || leaving || token !== restoreToken || !restoring) return;
      restorePosition(prose!, bookmark);
      restoring = false;
      update();
    }
    restoreAfterDialogRef.current = () => { void restoreAnchor(); };
    function beforePreferences() {
      if (!pendingAnchorRef.current) pendingAnchorRef.current = { ...latest };
    }
    function afterPreferences() { void restoreAnchor(); }
    function onResize() {
      if (restoring) return;
      // latest refers to the paragraph before the browser changed the layout.
      if (!pendingAnchorRef.current) pendingAnchorRef.current = { ...latest };
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { void restoreAnchor(); }, 160);
    }
    function refreshReadingState() { if (active) setReadingState(loadReadingState(novelSlug)); }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        // A native Back/Forward cache restores this exact document and its closures.
        leaving = false;
        restoring = false;
        pendingAnchorRef.current = sessionPosition(entry) ?? latest;
        void restoreAnchor();
      }
    }

    const params = new URLSearchParams(window.location.search);
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const bookmark = loadBookmark(novelSlug);
    const savedPosition = returning ? sessionPosition(entry) : null;
    const shouldResume = params.get("resume") === "1" || navigation?.type === "reload";
    const initialPosition = savedPosition ?? (shouldResume && bookmark?.chapterSlug === chapter.slug ? bookmark : null);
    if (initialPosition) latest = initialPosition;
    void (async () => {
      await afterLayout();
      if (!active || leaving) return;
      if (restoring && initialPosition && !window.location.hash) {
        restorePosition(prose, initialPosition);
        if ((initialPosition.progress ?? 0) > 0 || (initialPosition.paragraph ?? 0) > 0) {
          setResumed(true);
          noticeTimer = window.setTimeout(() => setResumed(false), 5000);
        }
      }
      restoring = false;
      update();
      persist(false);
    })();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("wheel", cancelInitialRestore, { passive: true });
    window.addEventListener("touchstart", cancelInitialRestore, { passive: true });
    window.addEventListener("keydown", cancelInitialRestore);
    window.addEventListener(PREFERENCES_WILL_CHANGE, beforePreferences);
    window.addEventListener(PREFERENCES_DID_CHANGE, afterPreferences);
    window.addEventListener(READING_CHANGE_EVENT, refreshReadingState);
    window.addEventListener("storage", refreshReadingState);
    return () => {
      persist(false);
      active = false;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(saveTimer);
      window.clearTimeout(noticeTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("wheel", cancelInitialRestore);
      window.removeEventListener("touchstart", cancelInitialRestore);
      window.removeEventListener("keydown", cancelInitialRestore);
      window.removeEventListener(PREFERENCES_WILL_CHANGE, beforePreferences);
      window.removeEventListener(PREFERENCES_DID_CHANGE, afterPreferences);
      window.removeEventListener(READING_CHANGE_EVENT, refreshReadingState);
      window.removeEventListener("storage", refreshReadingState);
      pendingAnchorRef.current = null;
      delete root.dataset.reader;
      delete root.dataset.readerTheme;
    };
  }, [novelSlug, chapter.slug, chapter.label, chapter.displayTitle]);

  useEffect(() => {
    if (settingsOpen || tocOpen) setToolbarHidden(false);
    else restoreAfterDialogRef.current();
  }, [settingsOpen, tocOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (dialogOpenRef.current || document.querySelector("dialog[open]") || isEditing(event.target) ||
          event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || !window.getSelection()?.isCollapsed) return;
      const destination = event.key === "p" ? chapter.prev : event.key === "n" ? chapter.next : undefined;
      if (destination) {
        event.preventDefault();
        persistRef.current();
        window.location.assign(`/novel/${novelSlug}/${destination.slug}/`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [novelSlug, chapter.prev, chapter.next]);

  const filteredChapters = chapters.filter((item) => `${item.label} ${item.displayTitle}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const currentIndex = chapters.findIndex((item) => item.slug === chapter.slug);
  const minutes = Math.max(1, Math.ceil((chapter.readingMinutes ?? 1) * (1 - progress)));
  const percentage = Math.round(progress * 100);
  const persist = (event?: MouseEvent<HTMLAnchorElement>) => {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    persistRef.current();
  };

  return (
    <div className="reader-shell" data-focus-mode={focusMode ? "true" : "false"}>
      <a className="skip-link" href="#main-content">Skip to the story</a>
      <div className="reader-progress-track" aria-hidden="true"><span style={{ width: `${percentage}%` }} /></div>
      <header className="reader-toolbar" ref={toolbarRef} data-hidden={toolbarHidden ? "true" : "false"}
        onFocusCapture={() => setToolbarHidden(false)}>
        <div className="reader-toolbar-inner">
          <Link href={`/novel/${novelSlug}/`} prefetch={false} onClick={persist} className="reader-book-link" title={novelTitle}>
            <span aria-hidden="true">←</span><span>{novelTitle}</span>
          </Link>
          <div className="reader-toolbar-actions" data-ready={ready ? "true" : "false"} aria-hidden={!ready}>
            <button type="button" disabled={!ready} className="reader-tool-button reader-contents-button" onClick={() => setTocOpen(true)} aria-label="Chapter contents" aria-haspopup="dialog" aria-expanded={tocOpen}>
              <BookIcon /><span>Contents</span>
            </button>
            <button type="button" disabled={!ready} className="reader-tool-button" onClick={() => setSettingsOpen(true)} aria-label="Reading appearance" aria-haspopup="dialog" aria-expanded={settingsOpen}>
              <span className="reader-aa" aria-hidden="true">Aa</span>
            </button>
            <button type="button" disabled={!ready} className="reader-tool-button reader-focus-button" aria-pressed={focusMode} aria-label={focusMode ? "Leave focus mode" : "Enter focus mode"}
              onClick={() => { setFocusMode(!focusMode); setToolbarHidden(false); }} title={focusMode ? "Leave focus mode" : "Enter focus mode"}>
              <FocusIcon active={focusMode} />
            </button>
          </div>
        </div>
      </header>

      <main className="reader-main" id="main-content" tabIndex={-1}>
        <article className="reader-article" aria-labelledby="chapter-title">
          <header className="reader-chapter-heading">
            <Link href={`/novel/${novelSlug}/`} prefetch={false} onClick={persist} className="reader-novel-title">{novelTitle}</Link>
            <p className="reader-chapter-label">{chapter.label}</p>
            <h1 id="chapter-title">{chapter.displayTitle || chapter.label}</h1>
            <div className="reader-chapter-meta"><span>{chapter.readingMinutes ?? 1} min read</span><span aria-hidden="true">·</span><span>{chapter.wordCount?.toLocaleString("en") ?? ""} words</span></div>
            <span className="reader-heading-rule" aria-hidden="true" />
          </header>

          {chapter.epilogueType === "branching" && chapter.branchSiblings && chapter.branchSiblings.length > 0 && (
            <aside className="reader-ending-note" aria-label="Alternate endings">
              <p>You&apos;re reading ending {chapter.epilogueKey}.</p>
              <span>Another path: {chapter.branchSiblings.map((sibling, index) => (
                <span key={sibling.slug}>{index > 0 && ", "}<Link href={`/novel/${novelSlug}/${sibling.slug}/`} prefetch={false} onClick={persist}>Ending {sibling.epilogueKey}</Link></span>
              ))}</span>
            </aside>
          )}

          <div ref={proseRef} className="prose-reader" dangerouslySetInnerHTML={{ __html: chapter.html }} />

          <div className="reader-chapter-end" aria-hidden="true"><span />✦<span /></div>

          {branchChoices.length > 1 && (
            <section className="reader-ending-choices" aria-labelledby="choose-ending-title">
              <p className="reader-section-label">Two paths from here</p>
              <h2 id="choose-ending-title">Choose your ending.</h2>
              <p>This story has {branchChoices.length} alternate endings. Read either first, then return to explore the other.</p>
              <div className="reader-ending-links">{branchChoices.map((choice) => (
                <Link key={choice.slug} href={`/novel/${novelSlug}/${choice.slug}/`} prefetch={false} onClick={persist}>
                  <span>Ending {choice.epilogueKey}</span><strong>{choice.displayTitle}</strong><span aria-hidden="true">↗</span>
                </Link>
              ))}</div>
            </section>
          )}

          <nav className="reader-chapter-navigation" aria-label="Chapter navigation">
            {chapter.prev ? (
              <Link href={`/novel/${novelSlug}/${chapter.prev.slug}/`} prefetch={false} onClick={persist} className="reader-previous-link">
                <span className="reader-nav-label">← Previous · {chapter.prev.label}</span><strong>{chapter.prev.displayTitle || chapter.prev.label}</strong>
              </Link>
            ) : <Link href={`/novel/${novelSlug}/`} prefetch={false} onClick={persist} className="reader-previous-link"><span className="reader-nav-label">← The book</span><strong>Synopsis &amp; contents</strong></Link>}
            {chapter.next ? (
              <Link href={`/novel/${novelSlug}/${chapter.next.slug}/`} prefetch={false} onClick={persist} className="reader-next-link">
                <span className="reader-nav-label">Next · {chapter.next.label} →</span><strong>{chapter.next.displayTitle || chapter.next.label}</strong>
              </Link>
            ) : branchChoices.length <= 1 ? (
              <Link href={`/novel/${novelSlug}/`} prefetch={false} onClick={persist} className="reader-next-link"><span className="reader-nav-label">The end →</span><strong>Return to the book</strong></Link>
            ) : null}
          </nav>
          <footer className="reader-footer">
            <Link href="/novel/" prefetch={false} onClick={persist}>Discover another story ↗</Link>
            <p>Reading position saved on this device.</p>
          </footer>
        </article>
      </main>

      <div className="reader-session-status" aria-label="Reading progress">
        <span>{chapter.label}</span><span className="reader-status-middle">{percentage}% <span aria-hidden="true">·</span> {percentage >= 100 ? "Chapter complete" : `About ${minutes} min left`}</span>
        <button type="button" disabled={!ready} data-ready={ready ? "true" : "false"} className="reader-status-contents" onClick={() => setTocOpen(true)} aria-label="Open chapter contents">{currentIndex + 1} / {chapters.length}</button>
      </div>
      {resumed && <p className="reader-resume-notice" role="status">Back where you left off.</p>}

      <ReaderSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <NativeDialog open={tocOpen} onClose={() => setTocOpen(false)} title="Chapter contents" className="reader-contents-dialog">
        <p className="reader-dialog-intro">{novelTitle}</p>
        <label className="reader-contents-search"><span className="sr-only">Search chapters</span>
          <input type="search" placeholder="Find a chapter…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <p className="reader-contents-summary">{filteredChapters.length} {filteredChapters.length === 1 ? "chapter" : "chapters"}{query && " found"}</p>
        <ol className="reader-contents-list">{filteredChapters.map((item) => {
          const current = item.slug === chapter.slug;
          const completed = readingState.chapters[item.slug]?.completed;
          return (
            <li key={item.slug}>
              <Link href={`/novel/${novelSlug}/${item.slug}/`} prefetch={false} aria-current={current ? "page" : undefined}
                onClick={(event) => { if (current) event.preventDefault(); else persist(event); setTocOpen(false); }}>
                <span className="reader-contents-label">{item.label}{item.epilogueType === "branching" && <span>Alternate ending</span>}</span>
                <span className="reader-contents-title">{item.displayTitle || item.label}<small>{current ? "Reading now" : completed ? "Completed" : `${item.readingMinutes ?? 1} min read`}</small></span>
                <span className="reader-contents-marker" aria-hidden="true">{current ? "●" : completed ? "✓" : "↗"}</span>
              </Link>
            </li>
          );
        })}</ol>
        {filteredChapters.length === 0 && <p className="reader-contents-empty">No chapters match that search. Try a chapter number or title.</p>}
        <p className="reader-local-note">Progress is stored on this device. With the page focused, use N for next and P for previous.</p>
      </NativeDialog>
      <noscript><style>{".reader-toolbar-actions,.reader-status-contents{display:none}"}</style><div className="reader-nojs-note">Use the chapter links at the end to move through the story. Reading preferences and saved positions require JavaScript.</div></noscript>
    </div>
  );
}

function BookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 5.5c-3-2-6.5-2-9-1v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Zm0 0v14" /></svg>;
}

function FocusIcon({ active }: { active: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={active ? "M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" : "M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5"} /></svg>;
}
