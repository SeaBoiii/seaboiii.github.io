import Link from "next/link";
import type { Novel } from "@/types/novel";
import { coverImageUrl } from "@/lib/images";
import ResponsiveImage from "./ResponsiveImage";

export default function NovelCard({ novel }: { novel: Novel }) {
  return (
    <article className="library-catalogue-book">
      <Link href={`/novel/${novel.slug}/`} prefetch={false} className="library-catalogue-cover" aria-label={`Discover ${novel.title}`}><ResponsiveImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} sizes="(max-width: 480px) 42vw, (max-width: 767px) 28vw, (max-width: 1100px) 21vw, 210px" /><span className="library-cover-action" aria-hidden="true">Enter the story ↗</span></Link>
      <div className="library-catalogue-copy">
        <p className="library-book-category">{novel.genre?.[0] ?? "Fiction"}</p>
        <h3><Link href={`/novel/${novel.slug}/`} prefetch={false}>{novel.title}</Link></h3>
        {novel.blurb && <p className="library-book-blurb">{novel.blurb}</p>}
        <p className="library-book-meta"><span>{novel.chapterCount} chapters &amp; endings</span><span>{novel.status}</span></p>
        <p className="library-book-time">About {novel.readingMinutes} min read</p>
        {novel.seriesLabel && <a href={`/novel/?series=${encodeURIComponent(novel.seriesId ?? "")}#collection`} className="library-book-series">{novel.seriesLabel === "secondskin" ? "Second Skin" : novel.seriesLabel}{novel.readingOrder ? ` · Book ${novel.readingOrder}` : ""}</a>}
      </div>
    </article>
  );
}
