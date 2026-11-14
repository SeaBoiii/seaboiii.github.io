"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import ResponsiveImage from "./ResponsiveImage";
import { coverImageUrl } from "@/lib/images";
import type { Novel } from "@/types/novel";

interface FeaturedWorld { novel: Novel; label: string; note: string; accent: string; }

export default function LibraryHero({ featured, count, completeCount }: { featured: FeaturedWorld[]; count: number; completeCount: number }) {
  const stage = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (pointer: fine)");
    let frame = 0;
    let visible = true;
    const update = () => {
      frame = 0;
      if (!motion.matches || !visible) return;
      const amount = Math.max(0, Math.min(1, -element.getBoundingClientRect().top / element.offsetHeight));
      element.style.setProperty("--library-drift", `${amount}`);
    };
    const request = () => { if (!frame && motion.matches && visible) frame = window.requestAnimationFrame(update); };
    const reset = () => { element.style.setProperty("--library-drift", "0"); request(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) request(); });
    observer.observe(element);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", reset);
    motion.addEventListener("change", reset);
    request();
    return () => { window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", request); window.removeEventListener("resize", reset); motion.removeEventListener("change", reset); element.style.removeProperty("--library-drift"); };
  }, []);

  return (
    <section ref={stage} className="library-hero" aria-labelledby="library-title">
      <div className="library-hero-atmosphere" aria-hidden="true" />
      <div className="library-hero-copy">
        <p className="library-eyebrow">Fiction by Aleem</p>
        <h1 id="library-title"><span>A world</span>{" "}<span>between</span>{" "}<em>the lines.</em></h1>
        <p className="library-hero-description">Love across distance. Lives beyond the familiar.<br className="library-wide-break" /> Stories that bring us back to ourselves.</p>
        <div className="library-hero-actions"><a href="#collection" className="novel-button">Find your next read <span aria-hidden="true">↓</span></a><a href="#worlds-heading" className="novel-link">Explore three worlds <span aria-hidden="true">↗</span></a></div>
        <div className="library-hero-facts"><span><strong>{count}</strong> novels</span><span><strong>{completeCount}</strong> complete stories</span><span>Read at your own pace</span></div>
      </div>
      <div className="library-hero-stage" aria-label="Three featured novels">
        <div className="library-hero-orbit" aria-hidden="true" />
        {featured.map(({ novel, accent, label }, index) => (
          <Link key={novel.slug} href={`/novel/${novel.slug}/`} prefetch={false} aria-label={`Discover ${novel.title}: ${label}`} className={`library-hero-book library-hero-book-${index + 1} library-hero-book-${accent}`}>
            <span className="library-hero-book-body"><ResponsiveImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} sizes="(max-width: 600px) 37vw, (max-width: 1023px) 26vw, 280px" loading="eager" fetchPriority={index === 1 ? "high" : "auto"} /></span>
            <span className="library-hero-book-caption"><span>{label}</span><strong>{novel.title}</strong><span aria-hidden="true">↗</span></span>
          </Link>
        ))}
      </div>
      <div className="library-hero-bottom"><span>A library for getting lost.<br />And finding something.</span><a href="#worlds-heading" aria-label="Scroll to the featured worlds"><span aria-hidden="true">↓</span></a><span>Romance / Fantasy<br />Speculative fiction / More</span></div>
    </section>
  );
}
