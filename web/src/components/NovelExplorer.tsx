"use client";

import { useMemo, useState } from "react";
import type { Novel } from "@/types/novel";
import NovelCard from "./NovelCard";

type StatusFilter = "all" | "complete" | "incomplete";
type CategoryFilter = "all" | "series" | "standalone";
type SortOrder = "az" | "za" | "newest";

interface Props {
  novels: Novel[];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export default function NovelExplorer({ novels }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [sort, setSort] = useState<SortOrder>("az");
  const [genre, setGenre] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const allGenres = useMemo(
    () =>
      uniq(novels.flatMap((n) => n.genre ?? []))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [novels],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = novels.filter((n) => {
      if (status === "complete" && !/complete/i.test(n.status)) return false;
      if (status === "incomplete" && /complete/i.test(n.status)) return false;
      if (category === "series" && !n.seriesId) return false;
      if (category === "standalone" && n.seriesId) return false;
      if (genre !== "all" && !(n.genre ?? []).includes(genre)) return false;
      if (q) {
        const hay = [
          n.title,
          n.blurb ?? "",
          (n.genre ?? []).join(" "),
          (n.tone ?? []).join(" "),
          (n.setting ?? []).join(" "),
          n.seriesLabel ?? "",
          n.relationType ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "za") return b.title.localeCompare(a.title);
      // "newest" — fall back to chapter count desc as a proxy for activity
      return (b.chapterCount ?? 0) - (a.chapterCount ?? 0);
    });

    return result;
  }, [novels, query, status, category, sort, genre]);

  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (sort !== "az" ? 1 : 0) +
    (genre !== "all" ? 1 : 0);

  function clearAll() {
    setStatus("all");
    setCategory("all");
    setSort("az");
    setGenre("all");
    setQuery("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search novels</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, blurb, genre, series…"
              className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-2"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                ["all", "All"],
                ["complete", "Complete"],
                ["incomplete", "Incomplete"],
              ]}
            />
            <FilterSelect
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as CategoryFilter)}
              options={[
                ["all", "Any"],
                ["series", "Part of a series"],
                ["standalone", "Standalone"],
              ]}
            />
            <FilterSelect
              label="Genre"
              value={genre}
              onChange={setGenre}
              options={[["all", "Any"] as [string, string]].concat(
                allGenres.map((g): [string, string] => [g, g]),
              )}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as SortOrder)}
              options={[
                ["az", "A–Z"],
                ["za", "Z–A"],
                ["newest", "Most chapters"],
              ]}
            />
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="self-end rounded-xl border border-border bg-bg px-3 py-2 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-text sm:col-span-2 lg:col-span-4 lg:w-fit"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <div aria-live="polite" className="text-sm text-muted">
        Showing {filtered.length} of {novels.length} novels
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-muted">
          No novels match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((n) => (
            <NovelCard key={n.slug} novel={n} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
