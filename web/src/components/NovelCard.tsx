import Link from "next/link";
import type { Novel } from "@/types/novel";
import { coverImageUrl } from "@/lib/images";
import { StatusBadge } from "./Badge";
import { seriesAccentClass } from "./seriesAccent";

export default function NovelCard({ novel }: { novel: Novel }) {
  const cover = coverImageUrl(novel);
  const accent = novel.seriesId ? seriesAccentClass(novel.seriesId) : null;

  return (
    <Link
      href={`/novel/${novel.slug}/`}
      className={
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-soft " +
        (accent ? `${accent.border} hover:${accent.borderHover}` : "border-border hover:border-accent/40")
      }
    >
      {accent && (
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`}
        />
      )}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cover}
          alt={`${novel.title} cover`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={novel.status} />
          {novel.seriesLabel && accent && (
            <span
              className={`inline-flex max-w-[60%] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent.chip}`}
              title={novel.seriesLabel}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.dot}`} aria-hidden />
              {novel.seriesLabel}
            </span>
          )}
        </div>
        <h3 className="font-display text-[1.05rem] font-semibold leading-snug text-text group-hover:text-accent-strong">
          {novel.title}
        </h3>
        {novel.blurb && (
          <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">{novel.blurb}</p>
        )}
        {novel.genre && novel.genre.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {novel.genre.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full border border-border bg-bg-2 px-2 py-0.5 text-[10.5px] text-muted"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
