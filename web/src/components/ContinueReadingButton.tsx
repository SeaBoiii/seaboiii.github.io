"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Bookmark {
  chapterSlug: string;
  chapterLabel: string;
  chapterTitle: string;
  ts: number;
}

function bookmarkKey(novelSlug: string) {
  return `bookmark:${novelSlug}`;
}

export function loadBookmark(novelSlug: string): Bookmark | null {
  try {
    const raw = localStorage.getItem(bookmarkKey(novelSlug));
    if (!raw) return null;
    return JSON.parse(raw) as Bookmark;
  } catch {
    return null;
  }
}

export function saveBookmark(novelSlug: string, b: Bookmark) {
  try {
    localStorage.setItem(bookmarkKey(novelSlug), JSON.stringify(b));
  } catch {}
}

export default function ContinueReadingButton({ novelSlug }: { novelSlug: string }) {
  const [bm, setBm] = useState<Bookmark | null>(null);

  useEffect(() => {
    setBm(loadBookmark(novelSlug));
  }, [novelSlug]);

  if (!bm) return null;
  return (
    <Link
      href={`/novel/${novelSlug}/${bm.chapterSlug}/`}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:border-accent/50 hover:bg-surface-2"
    >
      <span className="text-muted">Continue:</span>
      <span className="font-semibold">{bm.chapterLabel}</span>
    </Link>
  );
}
