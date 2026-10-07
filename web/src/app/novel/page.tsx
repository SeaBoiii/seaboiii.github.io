import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import NovelExplorer from "@/components/NovelExplorer";
import LibraryHero from "@/components/LibraryHero";
import ContinueReadingShelf from "@/components/ContinueReadingShelf";
import ResponsiveImage from "@/components/ResponsiveImage";
import { coverImageUrl } from "@/lib/images";
import { getAllNovels } from "@/lib/novels";
import type { Novel } from "@/types/novel";
import "@/styles/library.css";

export const metadata: Metadata = {
  title: "Aleem’s Novels — The library",
  description: "Fifty completed novels by Aleem. Discover romance, fantasy and speculative fiction, explore connected stories, and find your next read.",
};

const worlds = [
  { slug: "where-the-mist-begins", label: "Across distance", note: "Love finds a way through the fog.", accent: "mist" },
  { slug: "the-cinder-crown", label: "Beyond the ordinary", note: "Some promises reshape a world.", accent: "cinder" },
  { slug: "second-skin", label: "Beneath the surface", note: "What happens when another life feels more real?", accent: "skin" },
];

function tagText(novel: Novel) {
  return [...(novel.genre ?? []), ...(novel.tone ?? [])].join(" ").toLowerCase();
}

export default function NovelLandingPage() {
  const novels = getAllNovels();
  const featured = worlds.flatMap((world) => {
    const novel = novels.find((item) => item.slug === world.slug);
    return novel ? [{ ...world, novel }] : [];
  });
  const completeCount = novels.filter((novel) => /^complete$/i.test(novel.status.trim())).length;
  const series = Array.from(new Set(novels.map((novel) => novel.seriesId).filter(Boolean))).map((id) => {
    const books = novels.filter((novel) => novel.seriesId === id).sort((a, b) => (a.readingOrder ?? 99) - (b.readingOrder ?? 99));
    return { id: id!, label: books[0].seriesLabel === "secondskin" ? "Second Skin" : books[0].seriesLabel ?? id!, books };
  });
  const shelves = [
    { title: "Love, across every distance", note: "A chance encounter. An old connection. A feeling that refuses to fade.", mood: "romance", field: "q", books: novels.filter((novel) => /romance/.test(tagText(novel))).slice(0, 3), style: "rose" },
    { title: "Beyond the familiar", note: "Step into other worlds, altered realities, and the questions they leave behind.", mood: "fantasy", field: "q", books: novels.filter((novel) => /fantasy/.test(tagText(novel))).slice(0, 3), style: "indigo" },
    { title: "Something quietly human", note: "Small moments, fragile hopes, and the courage it takes to begin again.", mood: "tender", field: "mood", books: novels.filter((novel) => (novel.tone ?? []).some((tone) => tone.trim().toLowerCase() === "tender")).slice(0, 3), style: "sage" },
  ];

  return (
    <>
      <Header crumbs={[{ label: "The library" }]} />
      <main id="main" className="novel-library">
        <LibraryHero featured={featured} count={novels.length} completeCount={completeCount} />
        <ContinueReadingShelf novels={novels} />

        <section className="library-section library-worlds" aria-labelledby="worlds-heading">
          <div className="library-section-intro">
            <p className="library-eyebrow">A place to begin</p>
            <h2 id="worlds-heading" className="section-heading">Three worlds.<br />A thousand ways to feel.</h2>
            <p>From a mountain encounter to a fractured fantasy world and a life behind an avatar. Follow the story that stays with you.</p>
          </div>
          <div className="library-world-list">
            {featured.map(({ novel, label, note, accent }) => (
              <article key={novel.slug} className={`library-world library-world-${accent}`}>
                <Link href={`/novel/${novel.slug}/`} className="library-world-cover" aria-label={`Discover ${novel.title}`}>
                  <ResponsiveImage src={coverImageUrl(novel)} alt={`${novel.title} cover`} sizes="(max-width: 600px) 36vw, 180px" />
                </Link>
                <div className="library-world-copy">
                  <p className="library-eyebrow">{label}</p>
                  <h3><Link href={`/novel/${novel.slug}/`}>{novel.title}</Link></h3>
                  <p className="library-world-note">{note}</p>
                  <p className="library-world-blurb">{novel.blurb}</p>
                  <div className="library-world-meta"><span>{novel.chapterCount} chapters &amp; endings</span><span>{novel.status}</span></div>
                  <Link href={`/novel/${novel.slug}/`} className="novel-link">Enter the story <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="library-section library-moods" aria-labelledby="moods-heading">
          <div className="library-section-topline">
            <div><p className="library-eyebrow">Find a feeling</p><h2 id="moods-heading" className="section-heading">What calls to you?</h2></div>
            <a href="#collection" className="novel-link">See the whole collection <span aria-hidden="true">↓</span></a>
          </div>
          <div className="library-mood-grid">
            {shelves.map((shelf) => (
              <article key={shelf.title} className={`library-mood library-mood-${shelf.style}`}>
                <div className="library-mood-heading"><h3>{shelf.title}</h3><p>{shelf.note}</p></div>
                <ol className="library-mood-books">
                  {shelf.books.map((novel) => <li key={novel.slug}><Link href={`/novel/${novel.slug}/`}><ResponsiveImage src={coverImageUrl(novel)} alt="" sizes="48px" width={48} height={72} /><span>{novel.title}</span><span aria-hidden="true">↗</span></Link></li>)}
                </ol>
                <a href={`/novel/?${shelf.field}=${shelf.mood}#collection`} className="novel-link">Follow this feeling <span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        </section>

        <section className="library-section library-series" aria-labelledby="series-heading">
          <div className="library-section-topline"><div><p className="library-eyebrow">Connected stories</p><h2 id="series-heading" className="section-heading">Stay a little longer.</h2></div><p>Familiar worlds. Another perspective.<br />Explore the books that belong together.</p></div>
          <div className="library-series-grid">
            {series.map(({ id, label, books }) => (
              <article key={id} className="library-series-item">
                <a href={`/novel/?series=${encodeURIComponent(id)}#collection`} className="library-series-covers" aria-label={`Explore ${label}, ${books.length} books`}>
                  {books.slice(0, 3).map((novel, index) => <span key={novel.slug} style={{ "--book-index": index } as React.CSSProperties}><ResponsiveImage src={coverImageUrl(novel)} alt="" sizes="120px" /></span>)}
                </a>
                <div className="library-series-caption"><h3><a href={`/novel/?series=${encodeURIComponent(id)}#collection`}>{label}</a></h3><span>{books.length} books <span aria-hidden="true">↗</span></span></div>
              </article>
            ))}
          </div>
        </section>

        <section id="collection" className="library-section library-catalogue" aria-labelledby="collection-heading">
          <div className="library-section-topline"><div><p className="library-eyebrow">The complete collection</p><h2 id="collection-heading" className="section-heading">Find your next chapter.</h2></div><p>{novels.length} novels. {completeCount} complete.<br />Every story is here to read.</p></div>
          <NovelExplorer novels={novels} />
        </section>
        <footer className="library-footer"><p>Stories by Aleem.<br /><span>For the worlds we imagine, and the lives we recognise.</span></p><div><a href="#main" className="novel-link">Back to the beginning ↑</a><Link href="/" className="novel-link">Visit the portfolio ↗</Link></div></footer>
      </main>
    </>
  );
}
