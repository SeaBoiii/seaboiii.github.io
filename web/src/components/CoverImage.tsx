"use client";
import { useState } from "react";
import Lightbox from "./Lightbox";
import ResponsiveImage from "./ResponsiveImage";

export default function CoverImage({src, alt, className = "", priority = false, sizes = "(max-width: 640px) 70vw, 340px"}: {
  src: string; alt: string; className?: string; priority?: boolean; sizes?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <a href={src} className={`cover-image ${className}`} aria-label={`Enlarge ${alt}`} onClick={e => { e.preventDefault(); setOpen(true); }}>
      <ResponsiveImage src={src} alt={alt} sizes={sizes} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />
      <span className="cover-image-label">View cover</span>
    </a>
    {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
  </>;
}
