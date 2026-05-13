"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

export default function CoverImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Enlarge ${alt}`}
        className={
          "group relative block w-full overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-soft transition hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
          className
        }
      >
        <div className="aspect-[2/3] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
          />
        </div>
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-black opacity-0 transition group-hover:opacity-100">
          Click to enlarge
        </span>
      </button>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
