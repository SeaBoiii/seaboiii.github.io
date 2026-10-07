# Interactive fieldbook

A static Astro portfolio for Aleem Siddique, implemented on `revamp/interactive-fieldbook`. The homepage brings together AMD product development experience, independent engineering and web projects, fiction, and browser experiments. Its camera lens, circuit module and book form an interactive procedural 3D workbench.

HTML supplies the content and navigation. React and React Three Fiber power the scene; IBM Plex Sans and Literata are self-hosted. Six static case studies live under `/work/`: ICM Buddy, Train a Tiny AI, AI Rover Challenge, Classility, Novels Library and Crosswinds in Sapa.

## Build and preview

Use **Node.js 24**. From the repository root:

```powershell
npm --prefix web ci
npm --prefix showcase ci
npm --prefix web run build
npm --prefix showcase run build
npm --prefix showcase run assemble
npm --prefix showcase run preview:site
```

The complete site is served at **http://127.0.0.1:4173**. `assemble` copies existing static resources and the 875-page reader build into ignored `showcase/site-dist/`, then overlays the portfolio. It preserves `/novel/`, cover assets and the existing standalone pages. Separate browser projects, including Tetris, use their public project URLs. Optional local game folders are copied if present.

For a side-by-side comparison, start a second terminal at the repository root:

```powershell
npm --prefix showcase run preview:legacy
```

Open **http://127.0.0.1:4180** for the original homepage. The repository’s root `index.html` remains unchanged.

For fast portfolio iteration, use `npm --prefix showcase run dev`. Astro prints its development URL. This server covers the isolated app; root reader routes and cover images require the assembled preview. `npm --prefix showcase run preview` serves the Astro build alone and has the same integration limitation.

## Content and interactions

- `src/data/content.ts` holds the profile, supplied career details, projects and experiments. Featured book titles, genres, status and chapter counts are read from the existing Markdown front matter at build time.
- `/work/<slug>/` pages provide context, specific contributions, constraints, outcomes and source links. Public AMD-themed learning projects are distinguished from employment work; career quality/yield improvements are attributed to the team.
- The workbench uses native scrolling, a short desktop sticky sequence and keyboard-accessible object selectors. Touch layouts remain unpinned. A poster preserves the composition while loading, without JavaScript, or when WebGL fails.
- A persistent motion control and the operating-system reduced-motion preference suppress decorative choreography and autoplay. Videos include controls and pause offscreen; the scene renders on demand and stops offscreen.
- New media lives under `/showcase-assets/`. No runtime API or credential is required to use the website.

## Verification

Build and assemble both applications, then leave `preview:site` running. In another terminal:

```powershell
cd showcase
npx playwright install chromium
npm run test:site
```

The browser suite checks the homepage, all six case-study routes and refreshes, responsive overflow, filtering, keyboard focus, motion preferences, video playback, accessibility, and JavaScript/WebGL fallbacks. It also exercises the existing reader’s search, themes, settings and preserved chapter/alternate-ending routes. Reports and screenshots are written to ignored `qa/artifacts/`.

`npm run check` runs Astro’s type and template checks. `npm run build` includes that check before producing `dist/`. Rebuild and reassemble after content or source changes to update the complete preview.

A cold-cache mobile lab run at 390×844, with 1.6 Mbps throughput, 150 ms latency and 4× CPU slowdown, measured LCP at **1.18 s** and CLS at **0.0009**. The 3D scene was ready after **8.17 s** on the uncompressed local preview, with the poster visible first. A sampled Circuit interaction had a **200 ms Event Timing duration**; field INP remains unmeasured.

## Assets and deployment

[`ASSETS.md`](ASSETS.md) records the source of each photograph, project recording and generated visual, along with reproducible media commands and sanitized usage. Project footage demonstrates actual behaviour: the Tiny AI recording teaches and tests a classifier, the rover recording preserves failure feedback, and Classility reaches an illustrated result.

The current paid generation estimate is **about US$0.83**. The authorized limits are **SGD$28 for Gemini** and **US$30 combined**; provider billing remains the final source for actual cost. Asset generation occurs offline, and secrets are absent from repository and deployed files.

The GitHub Actions workflow builds revamp branches into a downloadable **`portfolio-comparison`** artifact. GitHub Pages publication is restricted to `main`; this branch does not automatically deploy the redesign live. `dist/`, `site-dist/` and QA scratch files are ignored build outputs.
