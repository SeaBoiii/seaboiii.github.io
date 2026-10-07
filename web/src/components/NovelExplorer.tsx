"use client";

import { useEffect, useMemo, useState } from "react";
import type { Novel } from "@/types/novel";
import NovelCard from "./NovelCard";

type Filters = { q: string; genre: string; mood: string; category: string; status: string; series: string; sort: string; };
const defaults: Filters = { q: "", genre: "all", mood: "all", category: "all", status: "all", series: "all", sort: "library" };
const storageKey = "novelExplorer:filters:v1";
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function options(novels: Novel[], field: "genre" | "tone") {
  const unique = new Map<string, string>();
  novels.flatMap((novel) => novel[field] ?? []).forEach((tag) => { const key = normalize(tag); if (key && !unique.has(key)) unique.set(key, label(tag)); });
  return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
}

export default function NovelExplorer({ novels }: { novels: Novel[] }) {
  const [filters, setFilters] = useState<Filters>(defaults);
  const [ready, setReady] = useState(false);
  const genres = useMemo(() => options(novels, "genre"), [novels]);
  const moods = useMemo(() => options(novels, "tone"), [novels]);
  const seriesOptions = useMemo(() => [...new Map(novels.filter((novel) => novel.seriesId).map((novel) => [novel.seriesId!, novel.seriesLabel === "secondskin" ? "Second Skin" : novel.seriesLabel ?? novel.seriesId!])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [novels]);

  useEffect(() => {
    const sanitize = (value: Record<string, unknown>): Filters => ({
      q: typeof value.q === "string" ? value.q.slice(0, 300) : typeof value.query === "string" ? value.query.slice(0, 300) : "",
      genre: typeof value.genre === "string" && genres.some(([key]) => key === normalize(value.genre as string)) ? normalize(value.genre) : "all",
      mood: typeof value.mood === "string" && moods.some(([key]) => key === normalize(value.mood as string)) ? normalize(value.mood) : "all",
      category: ["series", "standalone"].includes(String(value.category)) ? String(value.category) : "all",
      status: ["complete", "incomplete"].includes(String(value.status)) ? String(value.status) : "all",
      series: typeof value.series === "string" && seriesOptions.some(([key]) => key === value.series) ? value.series : "all",
      sort: ["az", "za", "chapters", "shortest", "series"].includes(String(value.sort)) ? String(value.sort) : "library",
    });
    const readUrl = () => {
      const parameters = new URLSearchParams(window.location.search);
      const hasParameters = Object.keys(defaults).some((key) => parameters.has(key));
      if (hasParameters) return sanitize(Object.fromEntries(parameters));
      try { const saved = window.localStorage.getItem(storageKey); if (saved) return sanitize(JSON.parse(saved)); } catch { /* The catalogue works without storage. */ }
      return defaults;
    };
    setFilters(readUrl());
    setReady(true);
    const onPopState = () => { const parameters = new URLSearchParams(window.location.search); setFilters(sanitize(Object.fromEntries(parameters))); };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [genres, moods, seriesOptions]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(filters)); } catch { /* Private browsing can disable storage. */ }
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(filters)) { if (value === defaults[key as keyof Filters]) url.searchParams.delete(key); else url.searchParams.set(key, value); }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [filters, ready]);

  const filtered = useMemo(() => {
    const query = normalize(filters.q);
    const result = novels.filter((novel) => {
      const complete = /^complete$/i.test(novel.status.trim());
      if (filters.status === "complete" && !complete || filters.status === "incomplete" && complete) return false;
      if (filters.category === "series" && !novel.seriesId || filters.category === "standalone" && novel.seriesId) return false;
      if (filters.genre !== "all" && !(novel.genre ?? []).some((tag) => normalize(tag) === filters.genre)) return false;
      if (filters.mood !== "all" && !(novel.tone ?? []).some((tag) => normalize(tag) === filters.mood)) return false;
      if (filters.series !== "all" && novel.seriesId !== filters.series) return false;
      return !query || normalize([novel.title, novel.blurb ?? "", ...(novel.genre ?? []), ...(novel.tone ?? []), ...(novel.setting ?? []), novel.seriesLabel ?? ""].join(" ")).includes(query);
    });
    if (filters.sort === "library") return result;
    return [...result].sort((a, b) => {
      if (filters.sort === "az") return a.title.localeCompare(b.title);
      if (filters.sort === "za") return b.title.localeCompare(a.title);
      if (filters.sort === "chapters") return b.chapterCount - a.chapterCount || a.title.localeCompare(b.title);
      if (filters.sort === "shortest") return (a.readingMinutes ?? 0) - (b.readingMinutes ?? 0) || a.title.localeCompare(b.title);
      return (a.seriesLabel ?? "\uffff").localeCompare(b.seriesLabel ?? "\uffff") || (a.readingOrder ?? 99) - (b.readingOrder ?? 99) || a.title.localeCompare(b.title);
    });
  }, [novels, filters]);
  const activeCount = Object.entries(filters).filter(([key, value]) => value !== defaults[key as keyof Filters]).length;
  function update(key: keyof Filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }

  return (
    <div className="library-explorer">
      <div className="library-search-row"><label className="library-search"><span className="sr-only">Search novels by title, description, genre, mood, or series</span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.5" /></svg><input type="search" value={filters.q} onChange={(event) => update("q", event.target.value)} placeholder="A title, a feeling, another world…" disabled={!ready} /></label>{activeCount > 0 && <button type="button" className="library-clear" onClick={() => setFilters(defaults)}>Clear filters <span aria-hidden="true">×</span></button>}</div>
      <div className="library-filter-row">
        <Filter label="Genre" value={filters.genre} disabled={!ready} onChange={(value) => update("genre", value)} options={[["all", "All genres"], ...genres]} />
        <Filter label="Mood" value={filters.mood} disabled={!ready} onChange={(value) => update("mood", value)} options={[["all", "Any mood"], ...moods]} />
        <Filter label="Collection" value={filters.category} disabled={!ready} onChange={(value) => update("category", value)} options={[["all", "All novels"], ["standalone", "Standalone"], ["series", "Connected stories"]]} />
        <Filter label="Series" value={filters.series} disabled={!ready} onChange={(value) => update("series", value)} options={[["all", "Every series"], ...seriesOptions]} />
        <Filter label="Status" value={filters.status} disabled={!ready} onChange={(value) => update("status", value)} options={[["all", "Any status"], ["complete", "Complete"], ["incomplete", "Incomplete"]]} />
        <Filter label="Order" value={filters.sort} disabled={!ready} onChange={(value) => update("sort", value)} options={[["library", "Library order"], ["az", "Title: A–Z"], ["za", "Title: Z–A"], ["chapters", "Most chapters"], ["shortest", "Shortest read"], ["series", "Series reading order"]]} />
      </div>
      <noscript><p className="library-noscript">Search and filters need JavaScript. The complete collection is listed below, and every story can be read.</p></noscript>
      <div className="library-results-line"><p role="status" aria-live="polite">{filtered.length === novels.length ? `All ${novels.length} novels` : `${filtered.length} of ${novels.length} novels`}</p><span>Reading time is estimated from the text.</span></div>
      {filtered.length ? <div className="library-catalogue-grid">{filtered.map((novel) => <NovelCard key={novel.slug} novel={novel} />)}</div> : <div className="library-empty"><h3>A different thread, perhaps?</h3><p>No novels match these filters. Try a broader search or explore the complete collection.</p><button className="novel-button-secondary" type="button" onClick={() => setFilters(defaults)}>Show every novel</button></div>}
    </div>
  );
}

function Filter({ label, value, disabled, onChange, options }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="library-filter"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
