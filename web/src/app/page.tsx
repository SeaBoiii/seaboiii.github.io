import Link from "next/link";

export default function Home() {
  // Static-export friendly landing redirect. Using client-side APIs keeps
  // root index.html deterministic for GitHub Pages.
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl font-semibold text-text">Aleem&apos;s Novels</h1>
      <p className="mt-3 text-muted">Opening the library…</p>
      <div className="mt-6">
        <Link
          href="/novel/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          Go to Novel Library
          <span aria-hidden>→</span>
        </Link>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: "setTimeout(function(){ location.replace('/novel/'); }, 150);",
        }}
      />
    </main>
  );
}
