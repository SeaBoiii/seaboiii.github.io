import type { Novel } from "@/types/novel";

export function coverImageUrl(novel: Pick<Novel, "slug" | "cover">): string {
  if (novel.cover) return novel.cover;
  return `/images/${novel.slug}-cover.png`;
}

/** Existing optimized local assets; custom paths retain their original URL. */
export function responsiveImageSources(src: string): { src: string; srcSet?: string } {
  if (!/^\/images\/[^/]+(?:-cover|-gallery-\d+)\.png$/i.test(src)) return { src };
  const base = src.replace(/\.png$/i, "");
  return { src: `${base}-320.webp`, srcSet: [320, 640, 960].map(w => `${base}-${w}.webp ${w}w`).join(", ") };
}
