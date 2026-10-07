/** Reading progress stays on this device; legacy bookmark keys remain compatible. */
export const READING_CHANGE_EVENT = "novel-reading-change";

export interface Bookmark {
  chapterSlug: string;
  chapterLabel: string;
  chapterTitle: string;
  ts: number;
  version?: 2;
  /** Position through this chapter, from zero to one. */
  progress?: number;
  /** Stable paragraph index and fractional position within it. */
  paragraph?: number;
  offset?: number;
  completed?: boolean;
}

export interface ChapterProgress {
  progress: number;
  completed: boolean;
  ts: number;
}

export interface ReadingState {
  version: 2;
  chapters: Record<string, ChapterProgress>;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clampProgress(value: unknown): number {
  return Math.max(0, Math.min(1, finite(value)));
}

/** Reject malformed records instead of following arbitrary stored paths. */
export function validateBookmark(value: unknown): Bookmark | null {
  if (!object(value) || typeof value.chapterSlug !== "string" ||
      !/^[A-Za-z0-9_-]+$/.test(value.chapterSlug)) return null;
  if (typeof value.chapterLabel !== "string" || typeof value.chapterTitle !== "string") return null;
  const bookmark: Bookmark = {
    version: 2,
    chapterSlug: value.chapterSlug,
    chapterLabel: value.chapterLabel.slice(0, 200),
    chapterTitle: value.chapterTitle.slice(0, 1000),
    ts: Math.max(0, finite(value.ts)),
    progress: clampProgress(value.progress),
    completed: value.completed === true,
  };
  if (typeof value.paragraph === "number" && Number.isFinite(value.paragraph) && value.paragraph >= 0) {
    bookmark.paragraph = Math.min(100000, Math.floor(value.paragraph));
    bookmark.offset = clampProgress(value.offset);
  }
  return bookmark;
}

function read(key: string): unknown {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function notify(novelSlug: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(READING_CHANGE_EVENT, { detail: { novelSlug } }));
  }
}

export function loadBookmark(novelSlug: string): Bookmark | null {
  return validateBookmark(read(`bookmark:${novelSlug}`));
}

export function saveBookmark(novelSlug: string, value: Bookmark): void {
  const bookmark = validateBookmark(value);
  if (!bookmark || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`bookmark:${novelSlug}`, JSON.stringify(bookmark));
    notify(novelSlug);
  } catch {
    // Private browsing and full storage must not interrupt reading.
  }
}

export function loadReadingState(novelSlug: string): ReadingState {
  const raw = read(`reading-state:${novelSlug}`);
  const chapters: Record<string, ChapterProgress> = Object.create(null) as Record<string, ChapterProgress>;
  if (object(raw) && object(raw.chapters)) {
    for (const [slug, value] of Object.entries(raw.chapters)) {
      if (!/^[A-Za-z0-9_-]+$/.test(slug) || !object(value)) continue;
      chapters[slug] = {
        progress: clampProgress(value.progress),
        completed: value.completed === true,
        ts: Math.max(0, finite(value.ts)),
      };
    }
  }
  return { version: 2, chapters };
}

export function saveReadingProgress(novelSlug: string, chapterSlug: string, value: ChapterProgress): void {
  if (typeof window === "undefined" || !/^[A-Za-z0-9_-]+$/.test(chapterSlug)) return;
  const state = loadReadingState(novelSlug);
  const previous = state.chapters[chapterSlug];
  state.chapters[chapterSlug] = {
    progress: Math.max(previous?.progress ?? 0, clampProgress(value.progress)),
    completed: previous?.completed === true || value.completed === true,
    ts: Math.max(0, finite(value.ts, Date.now())),
  };
  try {
    window.localStorage.setItem(`reading-state:${novelSlug}`, JSON.stringify(state));
    notify(novelSlug);
  } catch {}
}

export function markChapterRead(novelSlug: string, chapterSlug: string): void {
  saveReadingProgress(novelSlug, chapterSlug, { progress: 1, completed: true, ts: Date.now() });
}
