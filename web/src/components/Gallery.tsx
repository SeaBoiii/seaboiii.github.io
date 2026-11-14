"use client";

import { useEffect, useState } from "react";
import Lightbox from "./Lightbox";
import ResponsiveImage from "./ResponsiveImage";
import type { GalleryItem } from "@/types/novel";

export default function Gallery({ items, novelTitle }: { items: GalleryItem[]; novelTitle: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!items.length) return null;
  const current = items[active];
  const move = (direction: number) => setActive((index) => (index + direction + items.length) % items.length);

  return (
    <section className="book-gallery" aria-labelledby="book-gallery-title">
      <div className="book-section-heading">
        <div><p className="book-section-kicker">Beyond the page</p><h2 id="book-gallery-title" className="section-heading">A visual world</h2></div>
        <p>Artwork and imagined moments from <em>{novelTitle}</em>.</p>
      </div>
      <figure className="book-gallery-feature">
        <a
          href={current.url}
          className="book-gallery-stage"
          onClick={(event) => { event.preventDefault(); setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
            if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
          }}
          aria-label={`Enlarge illustration ${active + 1}${current.description ? `: ${current.description}` : ` from ${novelTitle}`}`}
        >
          <ResponsiveImage src={current.url} alt={current.description || `Illustration ${active + 1} from ${novelTitle}`} width={960} height={600} sizes="(max-width: 768px) 92vw, 1100px" />
          <span className="book-gallery-enlarge">Enlarge artwork <span aria-hidden="true">↗</span></span>
        </a>
        <div className="book-gallery-caption-row">
          <figcaption>{current.description || `Illustration ${active + 1} from ${novelTitle}`}</figcaption>
          <div className="book-gallery-controls">
            {ready && items.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Previous illustration">←</button>}
            <span aria-live="polite" aria-atomic="true">{active + 1} / {items.length}</span>
            {ready && items.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Next illustration">→</button>}
          </div>
        </div>
      </figure>
      {items.length > 1 && (
        <ol className="book-gallery-thumbnails" aria-label="Choose an illustration">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`}>
              <a href={item.url} aria-label={`View illustration ${index + 1}`} aria-current={index === active ? "true" : undefined} onClick={(event) => { event.preventDefault(); setActive(index); }}>
                <ResponsiveImage src={item.url} alt="" width={180} height={120} sizes="120px" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
      {open && <Lightbox src={current.url} alt={current.description || `Illustration ${active + 1} from ${novelTitle}`} onClose={() => setOpen(false)} />}
    </section>
  );
}
