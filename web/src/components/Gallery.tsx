"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";
import type { GalleryItem } from "@/types/novel";

export default function Gallery({ items, novelTitle }: { items: GalleryItem[]; novelTitle: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (items.length === 0) return null;

  const current = items[activeIdx];

  function prev() {
    setActiveIdx((i) => (i === 0 ? items.length - 1 : i - 1));
  }

  function next() {
    setActiveIdx((i) => (i === items.length - 1 ? 0 : i + 1));
  }

  return (
    <section className="mt-16">
      <h2 className="mb-4 font-display text-2xl font-semibold text-text">Gallery</h2>
      <p className="mb-5 text-sm text-muted">
        Concept art, alternate covers, and visual moments from <em>{novelTitle}</em>.
      </p>

      {/* Carousel */}
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open gallery fullscreen"
          className="group relative block w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card transition hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="aspect-[3/4] w-full sm:aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.description ?? "Gallery image"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          </div>
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-black opacity-0 transition group-hover:opacity-100">
            Click to enlarge
          </span>
        </button>

        {/* Description */}
        {current.description && (
          <p className="text-sm text-muted">
            <span className="font-medium text-text">{current.description}</span>
          </p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text transition hover:bg-surface-2 hover:border-accent/50"
          >
            ←
          </button>
          <p className="text-xs text-muted">
            <span className="font-medium text-text">{activeIdx + 1}</span> / {items.length}
          </p>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text transition hover:bg-surface-2 hover:border-accent/50"
          >
            →
          </button>
        </div>

        {/* Thumbnail strip */}
        {items.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {items.map((item, i) => (
              <button
                key={`${item.url}-${i}`}
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === activeIdx ? "true" : undefined}
                className={
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition " +
                  (i === activeIdx
                    ? "border-accent shadow-card"
                    : "border-transparent hover:border-border")
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          src={current.url}
          alt={current.description ?? "Gallery image"}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </section>
  );
}
