import type { Novel } from "@/types/novel";

export function coverImageUrl(novel: Pick<Novel, "slug" | "cover">): string {
  if (novel.cover) return novel.cover;
  return `/images/${novel.slug}-cover.png`;
}
