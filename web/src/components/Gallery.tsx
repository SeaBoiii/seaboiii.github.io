"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";
import type { GalleryItem } from "@/types/novel";

export default function Gallery({ items, novelTitle }: { items: GalleryItem[]; novelTitle: string }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-4 font-display text-2xl font-semibold text-text">Gallery</h2>
      <p className="mb-5 text-sm text-muted">
        Concept art, alternate covers, and visual moments from <em>{novelTitle}</em>.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item, i) => (
          <figure key={`${item.url}-${i}`} className="group">
            <button
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={item.description ?? `Gallery image ${i + 1}`}
              className="block w-full overflow-hidden rounded-xl border border-border bg-surface-2 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.description ?? `Gallery image ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
            </button>
            {item.description && (
              <figcaption className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">
                {item.description}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      {activeIdx !== null && items[activeIdx] && (
        <Lightbox
          src={items[activeIdx].url}
          alt={items[activeIdx].description ?? "Gallery image"}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </section>
  );
}
