import Link from "next/link";
import Header from "@/components/Header";

export default function NotFound() {
  return <>
    <Header />
    <main id="main" className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center gap-6 px-6 py-20">
      <h1 className="font-display text-4xl font-normal">This page isn’t on the shelf.</h1>
      <p className="max-w-prose text-muted">The book or chapter could not be found. Browse the library to find your story.</p>
      <div><Link href="/novel/" className="novel-button">Open the library</Link></div>
    </main>
  </>;
}
