import type { Metadata } from "next";
import Header from "@/components/Header";
import NovelExplorer from "@/components/NovelExplorer";
import { getAllNovels } from "@/lib/novels";

export const metadata: Metadata = {
  title: "Aleem's Novels — Library",
  description: "Browse completed and ongoing novels by Aleem.",
};

export default function NovelLandingPage() {
  const novels = getAllNovels();
  return (
    <>
      <Header crumbs={[{ label: "All Novels" }]} />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mb-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">
            Cozy Story Shelf
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-text sm:text-5xl">
            Available Novels
          </h1>
          <p className="mt-3 text-base text-muted sm:text-lg">
            A collection of {novels.length} stories — completed, ongoing, and quietly in progress.
            Settle in, search by mood or theme, then pick the one calling to you tonight.
          </p>
        </section>
        <NovelExplorer novels={novels} />
      </main>
    </>
  );
}
