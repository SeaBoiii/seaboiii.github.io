"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Novel } from "@/types/novel";
import { coverImageUrl } from "@/lib/images";
import { loadBookmark } from "./ContinueReadingButton";
import { READING_CHANGE_EVENT } from "@/lib/reader-state";
import ResponsiveImage from "./ResponsiveImage";

type SavedRead = { novel: Novel; bookmark: NonNullable<ReturnType<typeof loadBookmark>> & { completed?: boolean; progress?: number } };

export default function ContinueReadingShelf({ novels }: { novels: Novel[] }) {
  const [saved, setSaved] = useState<SavedRead[]>([]);
  useEffect(() => {
    const update = () => setSaved(novels.flatMap((novel) => {
      const bookmark = loadBookmark(novel.slug) as SavedRead["bookmark"] | null;
      return bookmark && typeof bookmark.chapterSlug === "string" && /^[\w-]+$/.test(bookmark.chapterSlug) ? [{ novel, bookmark }] : [];
    }).sort((a, b) => b.bookmark.ts - a.bookmark.ts).slice(0, 3));
    update();
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    window.addEventListener("pageshow", update);
    window.addEventListener(READING_CHANGE_EVENT, update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener("focus", update); window.removeEventListener("pageshow", update); window.removeEventListener(READING_CHANGE_EVENT, update); };
  }, [novels]);
  if (!saved.length) return null;
  return (
    <section className="library-section library-continue" aria-labelledby="continue-heading">
      <div className="library-section-topline"><div><p className="library-eyebrow">Your place is waiting</p><h2 id="continue-heading" className="section-heading">Pick up the thread.</h2></div><p>Reading progress saved on this device.</p></div>
      <div className="library-continue-grid">{saved.map(({ novel, bookmark }) => <Link key={novel.slug} className="library-continue-book" href={`/novel/${novel.slug}/${encodeURIComponent(bookmark.chapterSlug)}/?resume=1`} prefetch={false}><ResponsiveImage src={coverImageUrl(novel)} alt="" width={64} height={96} sizes="64px" /><span><strong>{novel.title}</strong><span>{bookmark.chapterLabel}{bookmark.chapterTitle ? ` · ${bookmark.chapterTitle}` : ""}</span><span className="library-continue-action">Continue reading <span aria-hidden="true">→</span></span></span></Link>)}</div>
    </section>
  );
}
