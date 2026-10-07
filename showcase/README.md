# Cinematic portfolio

A dark, single-page portfolio for Aleem Siddique, on `revamp/cinematic-dark`. This version starts from the light fieldbook at commit `7f497cf4`, in a separate worktree so both designs remain available.

## Build and compare

Use Node.js 24. From this worktree’s root:

```powershell
npm --prefix web ci
npm --prefix showcase ci
npm --prefix web run build
npm --prefix showcase run build
npm --prefix showcase run assemble
npm --prefix showcase run preview:site
```

Open **http://127.0.0.1:4174** for the cinematic portfolio and preserved novel reader. The light fieldbook remains at **http://127.0.0.1:4173** in the original worktree, with the original homepage at **http://127.0.0.1:4180**.

For development, run `npm --prefix showcase run dev -- --port 4326`. Astro allows one dev server per project. Root reader routes and novel cover assets are available in the assembled preview, rather than the isolated Astro server.

## Page and interactions

The homepage has five scroll chapters: the three-world 3D opening, AMD career, six featured project stories, fiction covers, and six experiment identities. All featured projects show their purpose, contribution, outcome and authentic demonstration media on the page.

Desktop scrolling drives the macro lens, unfolding circuit and opening book; highlights career details; advances a horizontal project sequence; and arranges the book covers and experiment marks. A shared controller uses native document scrolling. Pinning requires a fine pointer, motion enabled, width ≥1024px and height ≥700px. Phones, short screens and reduced motion use stacked content.

All twelve projects have transparent SVG marks. Their project details open in native modal dialogs. Share links use `/#project/<slug>`; Back closes a session, Forward reopens it, and switching projects replaces its history entry. Direct-link dismissal stays on the portfolio. Closing restores background scroll and keyboard focus. Background media and 3D stop while a dialog is open.

The 3D runtime loads after visibility and capability checks; unavailable WebGL and reduced-data connections use matching desktop/mobile posters. The canvas renders on demand. Real demo videos have controls and autoplay only when active and visible; manually paused videos stay paused. Novel reading, external demos and games use explicit read/launch links.

The existing `/work/<slug>/` pages remain accessible as compatibility fallbacks. The six case studies and dialogs use the same detail component. AMD career facts and team attribution are preserved; independent AMD-themed projects remain distinct from employment work.

## Verification

Build and assemble both applications, leave `preview:site` running, then:

```powershell
cd showcase
npx playwright install chromium
npm run test:site
node scripts/media-check.mjs
```

The browser suite covers desktop chapters, project jumps, all popouts, history, direct-link refresh, motion changes, background media suspension, keyboard/focus behavior, accessibility, responsive layouts, fallbacks, and the existing reader. Reports and screenshots are written to ignored `qa/artifacts/`. The media check fully decodes every supplied video without modifying assets.

`npm run build` includes Astro’s type and template check. `site-dist/` is excluded from type checking, since it contains the assembled reader’s generated JavaScript. Rebuild and reassemble after changes.

## Assets and publication

See [ASSETS.md](ASSETS.md) for origins, generation usage and reproduction. The dark posters and motion clip are captures of the authored 3D scene; the twelve logos are native SVGs. **No additional paid generation was made for the cinematic redesign.** The earlier generation estimate remains about US$0.83, within the SGD$28 Gemini and US$30 combined caps.

Capture the dark scene and share card with the dev preview running on 4326:

```powershell
npm --prefix showcase run media:workbench
node showcase/scripts/social-card.mjs
```

The workflow creates comparison artifacts for revamp branches and restricts GitHub Pages publication to `main`. Local builds do not publish the site. Existing root homepage, reader content, credentials and original untracked directories are preserved.
