"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ResponsiveImage from "./ResponsiveImage";
import { coverImageUrl, responsiveImageSources } from "@/lib/images";
import type { Novel } from "@/types/novel";
import type { ArchiveScene } from "./LibraryScene";

interface FeaturedWorld { novel: Novel; label: string; note: string; accent: string; }
interface LibraryHeroProps { featured: FeaturedWorld[]; novels: Novel[]; count: number; completeCount: number; }
const motionKey = "fieldbook-motion";

/** Real cover links are the default. WebGL is an optional, input-driven enhancement. */
export default function LibraryHero({ featured, novels, count, completeCount }: LibraryHeroProps) {
  const stage = useRef<HTMLElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const scene = useRef<ArchiveScene | null>(null);
  const [ready, setReady] = useState(false);
  const [motion, setMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(1);
  const motionRef = useRef(false);
  const motionChoice = useRef<boolean | null>(null);
  const selectedRef = useRef(1);

  useEffect(() => {
    const element = stage.current;
    const host = canvasHost.current;
    if (!element || !host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    let disposed = false;
    let loading = false;
    let failed = false;
    let booted = false;
    let capability: boolean | null = null;
    let visible = false;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let rememberedProgress = 0;
    let layout = { height: element.offsetHeight, viewport: innerHeight, y: scrollY, top: scrollY + element.getBoundingClientRect().top, pinned: false };

    const update = () => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const bounds = element.getBoundingClientRect();
      const amount = Math.max(0, Math.min(1, -bounds.top / Math.max(1, element.offsetHeight - innerHeight)));
      const progress = motionRef.current && desktop.matches ? amount : 0;
      if (motionRef.current && desktop.matches) rememberedProgress = progress;
      element.style.setProperty("--library-drift", String(progress));
      element.style.setProperty("--archive-progress", String(progress));
      scene.current?.setView({ progress, pointerX, pointerY, selected: selectedRef.current });
      layout = { height: element.offsetHeight, viewport: innerHeight, y: scrollY, top: scrollY + bounds.top, pinned: element.dataset.archivePinned === "true" };
    };
    const request = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(update); };
    const activate = () => {
      const active = visible && !document.hidden && motionRef.current;
      scene.current?.setActive(active);
      if (active) { void load(); request(); }
    };
    const load = async () => {
      if (!booted || loading || failed || scene.current || connection?.saveData || !motionRef.current || !visible || document.hidden) return;
      if (capability === null) {
        try {
          const probe = document.createElement("canvas");
          const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
          capability = Boolean(context);
          context?.getExtension("WEBGL_lose_context")?.loseContext();
        } catch { capability = false; }
      }
      if (!capability) { failed = true; host.dataset.archiveState = "unavailable"; element.dataset.archivePinned = "false"; return; }
      loading = true;
      try {
        const { createLibraryScene } = await import("./LibraryScene");
        if (disposed || !motionRef.current || !visible) { loading = false; return; }
        const ordered = [...featured.map(world => world.novel), ...novels.filter(novel => !featured.some(world => world.novel.slug === novel.slug))].slice(0, 24);
        scene.current = createLibraryScene(host, ordered.map((novel, index) => ({
          slug: novel.slug, title: novel.title,
          cover: responsiveImageSources(coverImageUrl(novel)).src,
          image: index < featured.length ? element.querySelector<HTMLImageElement>(`.library-hero-book-${index + 1} img`) ?? undefined : undefined,
        })), {
          onReady: () => { if (!disposed) { setReady(true); request(); } },
          onUnavailable: () => { if (!disposed) { failed = true; setReady(false); refreshMotion(); } },
        });
        scene.current.setActive(visible && !document.hidden && motionRef.current);
        request();
      } catch {
        failed = true;
        if (!disposed) setReady(false);
      }
      loading = false;
    };
    const refreshMotion = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(motionKey); } catch { /* Reading does not depend on storage. */ }
      const enabled = !reduced.matches && (motionChoice.current ?? saved !== "off") && !connection?.saveData;
      const oldBounds = element.getBoundingClientRect();
      const oldPinned = element.dataset.archivePinned === "true";
      const nextPinned = enabled && desktop.matches && !failed;
      const inChapter = oldBounds.top <= 1 && oldBounds.bottom > innerHeight * .25;
      const belowChapter = oldBounds.bottom <= innerHeight * .25;
      const oldDocumentTop = scrollY + oldBounds.top;
      motionRef.current = enabled;
      setMotion(enabled);
      element.dataset.archiveMotion = enabled ? "on" : "off";
      element.dataset.archivePinned = nextPinned ? "true" : "false";
      if (!enabled) {
        element.style.setProperty("--library-drift", "0");
        element.style.setProperty("--archive-progress", "0");
      }
      // Changing a pinned chapter must not move the catalogue under the reader.
      if (oldPinned !== nextPinned && element.dataset.archiveReady === "true") {
        const newBounds = element.getBoundingClientRect();
        if (belowChapter) scrollBy({ top: newBounds.height - oldBounds.height, behavior: "instant" });
        else if (inChapter) scrollTo({ top: oldDocumentTop + (nextPinned ? rememberedProgress * Math.max(0, newBounds.height - innerHeight) : 0), behavior: "instant" });
      }
      activate();
    };
    const onStorage = () => { motionChoice.current = null; refreshMotion(); };
    const onResize = () => {
      const previous = layout;
      refreshMotion();
      const nextHeight = element.offsetHeight;
      const nextPinned = element.dataset.archivePinned === "true";
      if (previous.pinned && (previous.pinned !== nextPinned || previous.viewport !== innerHeight)) {
        const inside = previous.y >= previous.top && previous.y < previous.top + previous.height - previous.viewport;
        if (inside) scrollTo({ top: previous.top + (nextPinned ? rememberedProgress * Math.max(0, nextHeight - innerHeight) : 0), behavior: "instant" });
        else if (previous.y >= previous.top + previous.height - previous.viewport) scrollTo({ top: previous.y + nextHeight - previous.height, behavior: "instant" });
      }
      scene.current?.resize(); request();
    };
    const onPointer = (event: PointerEvent) => {
      if (!motionRef.current || event.pointerType === "touch") return;
      const bounds = host.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / Math.max(1, bounds.width) - .5) * 2));
      pointerY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / Math.max(1, bounds.height) - .5) * 2));
      request();
    };
    const resetPointer = () => { pointerX = 0; pointerY = 0; request(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; activate(); }, { rootMargin: "120px 0px", threshold: 0 });
    observer.observe(element);
    const resize = new ResizeObserver(() => { scene.current?.resize(); request(); });
    resize.observe(host);
    element.addEventListener("pointermove", onPointer, { passive: true });
    element.addEventListener("pointerleave", resetPointer);
    element.addEventListener("archive:focus", request);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("storage", onStorage);
    window.addEventListener("portfolio:motion", refreshMotion);
    document.addEventListener("visibilitychange", activate);
    reduced.addEventListener("change", refreshMotion);
    desktop.addEventListener("change", onResize);
    setMounted(true);
    refreshMotion();
    idle = setTimeout(() => { booted = true; void load(); }, 500);
    return () => {
      disposed = true;
      clearTimeout(idle);
      cancelAnimationFrame(frame);
      observer.disconnect(); resize.disconnect();
      element.removeEventListener("pointermove", onPointer);
      element.removeEventListener("pointerleave", resetPointer);
      element.removeEventListener("archive:focus", request);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("portfolio:motion", refreshMotion);
      document.removeEventListener("visibilitychange", activate);
      reduced.removeEventListener("change", refreshMotion);
      desktop.removeEventListener("change", onResize);
      scene.current?.dispose(); scene.current = null;
    };
  }, [featured, novels]);

  function focusBook(index: number) {
    selectedRef.current = index; setSelected(index);
    stage.current?.dispatchEvent(new Event("archive:focus"));
  }
  function toggleMotion() {
    const next = !motion;
    motionChoice.current = next;
    try { localStorage.setItem(motionKey, next ? "on" : "off"); } catch { /* Session control still works without storage. */ }
    motionRef.current = next && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion(motionRef.current);
    scene.current?.setActive(motionRef.current && !document.hidden);
    if (stage.current) {
      stage.current.dataset.archiveMotion = motionRef.current ? "on" : "off";
      if (!motionRef.current) {
        stage.current.style.setProperty("--library-drift", "0");
        stage.current.style.setProperty("--archive-progress", "0");
      }
    }
    window.dispatchEvent(new Event("portfolio:motion"));
  }

  return (
    <section ref={stage} className="library-hero" data-archive-ready={ready ? "true" : "false"} aria-labelledby="library-title">
      <div className="library-hero-pin">
        <div className="library-hero-atmosphere" aria-hidden="true" />
        <div className="library-hero-copy">
          <p className="library-eyebrow">The collection / Written by Aleem Siddique</p>
          <h1 id="library-title"><span>Every book.</span>{" "}<span>Another</span>{" "}<span>world.</span></h1>
          <p className="library-hero-description">An engineer’s curiosity. A storyteller’s heart.<br className="library-wide-break" /> {count} novels about the lives we imagine, and the things that make us human.</p>
          <div className="library-hero-actions"><a href="#collection" className="novel-button">Enter the collection <span aria-hidden="true">↓</span></a><a href="#worlds-heading" className="novel-link">Find a place to begin <span aria-hidden="true">↗</span></a></div>
          <div className="library-hero-facts"><span><strong>{count}</strong> novels</span><span><strong>{completeCount}</strong> complete stories</span><span>All written by Aleem</span></div>
        </div>
        <div className="library-hero-stage" aria-label="Three featured novels and their three-dimensional archive">
          <div ref={canvasHost} className="library-archive-canvas" aria-hidden="true" />
          <div className="library-archive-coordinate" aria-hidden="true"><span>The archive</span><span>Imagination, in every direction</span></div>
          <div className="library-hero-books">
            {featured.map(({ novel, accent, label }, index) => (
              <Link key={novel.slug} href={`/novel/${novel.slug}/`} prefetch={false} onPointerEnter={() => focusBook(index)} onFocus={() => focusBook(index)} aria-label={`Discover ${novel.title}: ${label}`} className={`library-hero-book library-hero-book-${index + 1} library-hero-book-${accent}`} data-selected={selected === index ? "true" : "false"}>
                <span className="library-hero-book-body"><ResponsiveImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} sizes="(max-width: 600px) 29vw, (max-width: 1023px) 24vw, 200px" loading="eager" fetchPriority={index === 1 ? "high" : "auto"} /></span>
                <span className="library-hero-book-caption"><span>{label}</span><strong>{novel.title}</strong><span aria-hidden="true">↗</span></span>
              </Link>
            ))}
          </div>
          <p className="library-archive-note">Romance. Fantasy. Another perspective.</p>
        </div>
        <div className="library-hero-bottom">
          <span>Rough edges.<br />Entire worlds within.</span>
          <a href="#worlds-heading" aria-label="Scroll to the featured worlds"><span aria-hidden="true">↓</span></a>
          <button type="button" className="library-motion-toggle" disabled={!mounted} onClick={toggleMotion} aria-pressed={!motion}><span aria-hidden="true">{motion ? "Ⅱ" : "▷"}</span>{motion ? "Pause motion" : "Motion paused"}</button>
        </div>
      </div>
    </section>
  );
}
