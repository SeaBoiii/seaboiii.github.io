# Literary gallery and reader

The novels redesign is on `revamp/novels-library`, based on the cinematic portfolio at `172b868d`. Next.js statically exports the existing Markdown books and chapters. Astro supplies the portfolio homepage; the combined output retains the existing standalone pages.

## Build and preview

Use Node.js 24. From this worktree’s root:

```powershell
npm --prefix web ci
npm --prefix showcase ci
npm --prefix web run build
npm --prefix showcase run build
npm --prefix showcase run assemble
npm --prefix showcase run preview:novels
```

Open **http://127.0.0.1:4175/novel/** for the redesigned library, book pages and reader. The same preview includes the cinematic portfolio at its root. Existing comparison previews stay on 4173 (light), 4174 (cinematic portfolio and earlier reader), and 4180 (original homepage).

The independent worktree is `C:/Users/seabo/Documents/GitHub/seaboiii.github.io-novels`. Build outputs and QA artifacts are ignored. This branch creates a comparison artifact in CI; only `main` publishes to GitHub Pages.

## Design and content

The library uses the existing cover artwork, restrained CSS book depth and native scrolling. Curated collections lead into the complete searchable catalogue. Each book retains its full synopsis, contents, relationships and actual illustration gallery. Reading time is an estimate calculated at 220 words per minute.

The reader uses native selectable HTML prose. Night, dim, paper and sepia themes, font size, line spacing and width are independent reading preferences. Literata and IBM Plex Sans are self-hosted. The six older font options remain available and their font files download only when used.

Source content stays in `novel/<slug>/index.md` and chapter Markdown files. Case-sensitive chapter URLs, actual A/B endings, sequential epilogues and the authoring tools are preserved.

## Saved reading

Progress is stored locally on the reader’s device. Existing `bookmark:<slug>` and `reader-prefs` records are validated and migrated in place. Bookmarks include paragraph-relative position. `reading-state:<slug>` stores chapter progress and completion; session positions track individual browser history entries. Storage errors leave reading usable.

Contents, settings and image previews use native modal dialogs with Escape dismissal, contained focus, background scroll locking and opener focus restoration. The default page and prose remain available without JavaScript. Reduced motion disables cover movement.

## Verification

With the combined preview running:

```powershell
npm --prefix showcase run test:novels
npm --prefix showcase run test:reader
npm --prefix web run test:content
$env:SITE_URL = 'http://127.0.0.1:4175'
npm --prefix showcase run test:site
```

The novel suite checks exported content routes, discovery, book contents, ending navigation, saved progress, preference changes, keyboard and dialog behaviour, accessibility, 320px layouts and fallbacks. Reports and screenshots are written to `web/qa/artifacts/`. Performance numbers are local lab measurements, not field results.

Verified on 7 October 2026: both production builds passed, along with 889 content checks, 316 combined site checks, 102 novels checks and nine reader-state regression groups. The tested pages had no automated accessibility violations or browser JavaScript errors. Cold-cache Chromium measurements at 390px, 4× CPU slowdown, 1.6Mbps and 80ms latency gave library LCP 1.17s / CLS 0.013 and reader LCP 0.63s / CLS 0.022.

Existing covers and gallery assets supply the redesign. No paid generation is used.
