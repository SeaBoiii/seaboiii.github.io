# Aleem Siddique — The Compute Core

An independent React / Vite / TypeScript portfolio, overlaid onto the root of the existing GitHub Pages site. Its second edition pairs expressive vermilion/cobalt sections with one locally sticky, scroll-driven compute-module expansion. Full content is prerendered into HTML; an authored exploded SVG preserves the core chapter when JavaScript or WebGL is unavailable.

Page order: identity, expanding core, four selected cases, four-project AMD collection, journey, toolkit, six-project playground, about and contact. The root portfolio also offers an optional locally stored instrumental soundtrack, off on every visit and requested only after a click.

## Develop

Use Node 22.12+ (CI uses Node 22).

```sh
cd portfolio
npm ci
npm run dev
```

This starts the portfolio at `http://127.0.0.1:5173/`. Media preparation derives WebP previews from tracked originals, optimizes the generated About illustration, and copies the finished local MP3. Builds need no generation API, credentials or external asset service. Test novel and legacy routes in the assembled production preview. Independently deployed GitHub Pages projects such as Tetris are verified on their live URLs; their builds are not part of this repository.

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
npm run qa:revision -- http://127.0.0.1:4173 revision
npm run qa:soundtrack -- http://127.0.0.1:4173
```

Browser verification uses Playwright Chromium (`npx playwright install chromium` if not already installed) and axe. Screenshots, recordings and detailed JSON are written to ignored `qa/artifacts/`. The revision must cover continuous/reverse/rapid core scrolling, intermediate layer positions, desktop/mobile/tablet and short-height layouts, keyboard focus, contrast, zoom/reflow, overflow, fallbacks and errors. Audio checks include zero initial media requests, explicit playback/pause, loading cancellation/retry and interruption when hidden. Consult `docs/QA_REPORT.md` for the actual executed results and limitations; planned checks are not proof of completion. Physical battery, thermal and GPU results require real devices; local lab data is not field INP.

`?quality=static` forces the authored fallback. Reduced-motion preferences, data-saving connections, low-memory/low-thread devices and failed graphics contexts use the same fallback. The standard scene opens through Hardware, Intelligence and Interaction at a fixed viewing angle; navigation and pointer movement do not change its pose. Short-height layouts return to normal flow. Rendering uses capped DPR and comes to rest; hidden/offscreen canvases stop requesting frames. `window.__computeDiagnostics` exposes layer positions and rendering counts for local profiling.

Music uses a native audio element at volume 0.25. The 60-second requested `music_v2_5` instrumental is stored under `assets/audio/` with its prompt and provenance. Playback is independent of the scene, pauses when hidden or leaving the page, and requires another click to resume. No enabled preference is persisted. Its approximately 0.96 MB file is excluded from initial page transfer until the visitor chooses sound.

## Maintain content and identity

- `src/content.ts`: verified copy, projects, journey and links.
- `src/AmdCollection.tsx`: four AMD-inspired experiments with source, verified live and case-study links.
- `src/ProjectVisual.tsx`: honest schematics, real interface previews and prototype view.
- `src/ComputeCore.tsx`: original procedural geometry, scene and quality tiers.
- `src/scrollSignal.ts`: independent section-navigation tracking and normalized local core progress.
- `src/Soundtrack.tsx`: accessible opt-in audio lifecycle, loading and error handling.
- `src/revision.css`: second-edition colour, composition, local scene and responsive overrides.
- `scripts/prepare-media.mjs`: reproducible derived media, local MP3 copy and social preview, leaving originals intact.
- `assets/images/` and `assets/audio/`: tracked generated sources and provenance; ignored public outputs are recreated by every build.
- `docs/DESIGN_RESEARCH.md`, `DESIGN_SYSTEM.md`, `CONTENT_EVIDENCE.md`: research, chosen direction and claim boundaries.
- `docs/directions.html`: three preimplementation art-direction studies, not shipped variants.
- `docs/ROUTE_INVENTORY.md`, `QA_REPORT.md`: preservation and review evidence.

Fonts are self-hosted Instrument Sans and IBM Plex Mono, licensed under the SIL Open Font License. Copies ship under `portfolio-assets/licenses/`. Project previews remain evidence of the source projects; generated/illustrated system studies are not commercial-device evidence. No current employer/title is inferred from repository names.

The revision uses the installed Anthropic `frontend-design` skill, the ElevenLabs `music` skill installed through the requested skills CLI workflow, and existing 21st build/review guidance. These are authoring tools, not frontend dependencies. 21st catalog authentication was unavailable, so no catalog retrieval or hosted generation is claimed. Keep this revision on `redesign/compute-core` for review; deployment is a separate step.
