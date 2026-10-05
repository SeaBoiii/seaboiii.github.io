# Aleem Siddique — The Compute Core

An independent React / Vite / TypeScript portfolio, overlaid onto the root of the existing GitHub Pages site. A procedural Three.js / React Three Fiber object shares native scroll progress with semantic DOM chapters. It is a visual enhancement: full content is prerendered into HTML, and the hero retains an authored SVG when JavaScript or WebGL is unavailable.

## Develop

Use Node 22.12+ (CI uses Node 22).

```sh
cd portfolio
npm ci
npm run dev
```

This starts the portfolio at `http://127.0.0.1:5173/`. Media preparation derives lightweight WebP previews from existing originals. Novel and independently deployed mini-project routes should be tested in the assembled production preview.

## Build the complete site

Run from the repository root:

```sh
npm ci --prefix web
npm run build --prefix web
npm ci --prefix portfolio
npm run build --prefix portfolio
node portfolio/scripts/assemble-deploy.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory deploy
```

Open `http://127.0.0.1:4173/`. Assembly checks every source-derived novel/chapter route and compares preserved files with their originals. It rejects new portfolio files outside `portfolio-assets/` except `index.html`. Root `index.html` remains the archived legacy source; the deployed homepage is `portfolio/dist/index.html`.

## Quality checks

```sh
cd portfolio
npm run check
npm run qa -- http://127.0.0.1:4173 second
```

The actual-browser audit captures desktop and five mobile sizes, checks WCAG AA with axe, keyboard controls, reduced motion, static mode, missing WebGL, no JavaScript, overflow, console/network errors, and local performance observations. It needs Playwright Chromium (`npx playwright install chromium` if not already installed). Screenshots and detailed JSON are written to ignored `qa/artifacts/`. Physical battery, thermal and GPU results require real devices; local lab data is not field INP.

`?quality=static` forces the authored fallback. Data-saving connections, low-memory/low-thread devices and failed graphics contexts use the same fallback. Rendering uses capped DPR and comes to rest; hidden/offscreen canvases stop requesting frames. The core's “Look inside” control exposes a restrained engineering note and opt-in `window.__computeDiagnostics` for profiling.

## Maintain content and identity

- `src/content.ts`: verified copy, projects, journey and links.
- `src/ProjectVisual.tsx`: honest schematics, real interface previews and prototype view.
- `src/ComputeCore.tsx`: original procedural geometry, scene and quality tiers.
- `src/scrollSignal.ts`: shared native-scroll chapter/anchor orchestration.
- `scripts/prepare-media.mjs`: derived media and social preview, leaving originals intact.
- `docs/DESIGN_RESEARCH.md`, `DESIGN_SYSTEM.md`, `CONTENT_EVIDENCE.md`: research, chosen direction and claim boundaries.
- `docs/directions.html`: three preimplementation art-direction studies, not shipped variants.
- `docs/ROUTE_INVENTORY.md`, `QA_REPORT.md`: preservation and review evidence.

Fonts are self-hosted Instrument Sans and IBM Plex Mono, licensed under the SIL Open Font License. Copies ship under `portfolio-assets/licenses/`. Project previews remain evidence of the source projects; illustrated system studies are labelled as such. No current employer/title is inferred from repository names.
