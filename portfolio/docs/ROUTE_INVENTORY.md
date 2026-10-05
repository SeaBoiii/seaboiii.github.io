# Route preservation and deployment architecture

Inspected 5 October 2026 on `redesign/compute-core`, before implementation. No `AGENTS.md` was present in the repository or its parent directories.

## Existing ownership

| URL or namespace | Source / build owner | Preservation rule |
| --- | --- | --- |
| `/` and `/index.html` | Existing root `index.html`; replaced by `portfolio/dist/index.html` | Only this experience changes. Keep the original source available on the redesign branch. |
| `/novel/` | `web/` Next.js static export | Preserve exported `novel/index.html`. |
| `/novel/<slug>/` | Novel `index.md` files, through `web/src/lib/novels.ts` | Preserve every generated novel overview. |
| `/novel/<slug>/Chapter<number>/` | Novel `Chapter*.md` files, through `web/src/lib/chapters.ts` | Preserve exact filename case and trailing-slash route. |
| `/novel/<slug>/Epilogue…/` | Novel `Epilogue*.md` files, through the same reader | Preserve sequential and branching endings, not just ordinary chapters. |
| `/_next/` | `web/out/_next` | Keep every exported reader chunk and font resource. |
| `/404.html` | Next.js static export | Preserve existing 404 behavior. Do not install an SPA fallback at the root. |
| `/foryou.html` | Root standalone HTML | Preserve `css/style.css` and `js/script.js`, plus external GIF URLs. |
| `/hny.html` | Root standalone HTML | Preserve `css/style_hny.css` and `js/script_hny.js`. |
| `/vday.html` | Root standalone HTML | Preserve `css/vdaystyle.css`, `js/webpack*.js`, `js/polyfill.js`, and `img/c9a5bc6a7c948fb0-s.p.woff2`. |
| `/images/` | Existing images and novel covers | Copy without renaming, resizing or replacing originals. |
| `/img/` | Existing project media, identity files and fonts | Copy without modification. |
| `/css/` and `/js/` | Existing static assets | Preserve shared and standalone dependencies. The new portfolio does not import their globals. |
| `/assets/` | Legacy reader CSS and scripts | Preserve this namespace as well; the previous workflow omitted it. |
| Root favicons and `/site.webmanifest` | Existing static files | Preserve these URLs. |
| `/portfolio-assets/` | New portfolio build | All new Vite JavaScript, CSS, fonts and media belong here. |

The inventory contains **50 novel directories and 820 chapter/epilogue Markdown files** at inspection time. Verification derives routes directly from the source instead of freezing these counts, so future writing can add stories without editing the deployment script.

## Mini projects on the same domain

The existing homepage links to `/potionality/`, `/classility/`, `/age_of_war/`, `/nizam/`, `/tetris/`, `/wordle/`, `/visual_novel/`, and `/mmorpg/`. None of these project directories is present in this checkout. They are links to separate project deployments under the GitHub Pages account, not application routes owned by this root repository. The old workflow conditionally copied local `tetris/` and `wordle/` directories if present; that conditional preservation remains.

Do not create placeholder pages for those URLs, rewrite them to the portfolio, or claim their code is included in this artifact. Public project URLs can be checked separately from the root artifact. Their deployment configuration belongs to their own repositories.

A live HTTP HEAD check on 5 October 2026 returned 200 for all eight mini-project URLs above, all three standalone HTML pages, `/novel/`, and `/novel/the-time-we-were/Chapter1/`. This is the preservation baseline, not a guarantee of future availability for independently deployed projects.

Available preview material includes `images/hub/*-site.png` and `*-logo.svg`, `img/icm_buddy.gif`, `img/ntu_singapore_onigroup_google_cloud.jpg`, `img/probow.png`, and `img/a1e3m.jpg`. These existing media remain available at their original paths.

## Existing build behavior

`web/next.config.mjs` uses `output: "export"`, `trailingSlash: true`, and unoptimized images. The build must execute with `web/` as the working directory: `web/src/lib/paths.ts` resolves the novel Markdown and relationship data relative to that directory. `web/out/index.html` redirects to the novel library; it is intentionally overwritten by the portfolio landing page, just as it was previously overwritten by the old root homepage.

The active `.github/workflows/deploy.yml` deploys on pushes to `main` and manual dispatch. The disabled Jekyll workflow is historical. Raw Markdown, Liquid layouts, `novel/index_backup.html` and `index_old.html` files are source/history artifacts, not routes in the current Next.js deployment. Copying raw `novel/` over the Next.js output would replace the functioning reader and expose unrendered source; do not do that.

## Assembly order and checks

1. Build the unchanged `web/` application.
2. Build the independent `portfolio/` Vite application with base `/` and `assetsDir: "portfolio-assets"`.
3. Copy supported static directories, root icons/manifest, and standalone pages into `deploy/`.
4. Copy `web/out/` into `deploy/`, preserving its novel routes, `_next` namespace and 404 page.
5. Overlay `portfolio/dist/` last, replacing only the landing page and adding its isolated assets.
6. Add `.nojekyll`, verify every source-derived novel and chapter route, compare preserved files with their sources, and check local standalone dependencies.
7. Upload the assembled directory to Pages.

`portfolio/scripts/assemble-deploy.mjs` is the portable local and CI assembly entrypoint. `portfolio/scripts/verify-deploy.mjs` can rerun preservation checks independently. New portfolio files are rejected if they collide with existing reader or static output, except the deliberately replaced root `index.html`.

## Limits of artifact checks

File and route checks prove that supported local content survives assembly, and catch missing build output, case changes and accidental overlays. They do not establish keyboard behavior, reader interactivity, mobile layout, external project uptime or visual quality; those require browser QA. Redesign work remains on a new branch until visual review. The workflow does not broaden automatic deployment beyond `main`.
