"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadBookmark, READING_CHANGE_EVENT, type Bookmark } from "@/lib/reader-state";

// Existing callers and saved bookmarks keep the same public API.
export { loadBookmark, saveBookmark } from "@/lib/reader-state";
export type { Bookmark } from "@/lib/reader-state";

export default function ContinueReadingButton({ novelSlug }: { novelSlug: string }) {
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);

  useEffect(() => {
    const update = () => setBookmark(loadBookmark(novelSlug));
    update();
    window.addEventListener("storage", update);
    window.addEventListener("pageshow", update);
    window.addEventListener(READING_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("pageshow", update);
      window.removeEventListener(READING_CHANGE_EVENT, update);
    };
  }, [novelSlug]);

  if (!bookmark) return null;
  return (
    <Link
      href={`/novel/${novelSlug}/${bookmark.chapterSlug}/?resume=1`}
      prefetch={false}
      className="novel-button novel-button-secondary reader-continue"
      aria-label={`Continue ${bookmark.chapterLabel}${bookmark.chapterTitle ? `: ${bookmark.chapterTitle}` : ""}`}
    >
      <span>Continue reading</span>
      <span className="reader-continue-label">{bookmark.chapterLabel}</span>
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
