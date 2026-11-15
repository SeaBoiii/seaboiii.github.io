# Rough edges. Precise work.

This revision translates Aleem's brief — a rough exterior with a polished interior — into a shared visual language for his portfolio and novel collection. The purpose of the motion is to reveal the person and the work, while keeping the work itself easy to explore.

## Starting point

- Fetched `origin` before implementation and based `revamp/aleem-facets` on the latest remote `main`, `568d7c3d`.
- Integrated the previously approved Literary Gallery and Novel Wizard branch, `9a26328b`, which was not yet included in `main`. The newer homepage and the newer reader are both retained in the branch history.
- Kept Astro, the static Next.js novel export, the Markdown source, the project popouts and the existing authoring workflow.

## Why these design choices

### One object with several sides

The portfolio opens with a fractured carbon specimen and a carefully finished interior. Rough shell faces, polished facets and fine copper pathways make the contrast physical. Scrolling opens the form into an engineered system, then into books. This connects Aleem's engineering, independent projects and fiction through one transformation.

The specimen's asymmetry expresses the rough exterior in the brief. Its torn shell exposes a precisely finished interior. The small copper A and the real book covers give the form a specific owner.

### Motion with a destination

Camera travel, separation of the shell and the appearance of the inner layers follow native scrolling. The pieces settle when input stops. Pointer movement adds a small change in perspective to the scene.

The previous film layer's recording indicator, invented timecode and introductory wait were removed. They suggested a film production interface, and delayed the useful opening. The existing chapter sequence, entry reveals, real demonstrations and project details still provide the cinematic rhythm.

### A collection to enter

The novel landing page uses real cover textures on volumetric books, with page blocks, spines and depth. A spatial archive replaces the earlier shallow cover-plane arrangement. The camera and books respond to scrolling. The collection then releases into curated shelves and the complete searchable catalogue.

The covers are the author's existing artwork. Featured HTML links and the complete catalogue provide direct access to the books alongside the 3D scene.

### A restrained material palette

Carbon `#080A10`, warm silver `#EEECE6`, muted silver, ice blue `#B9DBEA` and a small copper accent `#C89C78` carry across both entrances. Copper highlights suggest exposed seams and circuits. Project marks and book covers carry their individual colours.

IBM Plex Sans carries the portfolio and interface text. Literata serves as the literary display and reading face. The portfolio's large plain headline gives the scene room to carry the spectacle. The reader uses quieter typography for comfortable reading.

## Generated assets and provenance

Higgsfield 3D Jutsu supplied the editable scene construction, rendering and visual inspection workflow.

- [Editable Higgsfield scene](https://higgsfield.ai/3d-jutsu/a80f0d8c-46ed-46de-b334-742fe93c8587), verified revision 2.
- `assets/motion/aleem-specimen.glb` contains the compact specimen with individually pivoted shell fragments, a polished core and surface-following copper detail.
- `assets/motion/aleem-specimen-poster.webp` provides an inspected, optimized render of the authored scene.
- `assets/motion/provenance.json` records the source revision, generation operations, geometry contract, file hashes and verification notes.
- `tools/motion/build_aleem_specimen.py` supplies the reproducible scene construction source.

Paid image/video generation submissions total zero. Browser-rendered posters and motion captures derive from the implemented scenes and the existing authorized cover artwork.

## Implementation decisions

- The portfolio retains React Three Fiber's demand-rendered canvas and its existing chapter, motion and dialog events.
- The novel archive uses a separately loaded vanilla Three.js renderer. This avoids sharing a React Three Fiber island between the independently built React applications.
- Heavy scene code and textures load after capability and motion checks. Scene drawing pauses offscreen, when the document is hidden, and when motion is disabled.
- Real HTML content and static artwork support disabled JavaScript, unavailable WebGL, reduced motion and reduced data. Mobile uses a shorter composition and fewer scene objects.
- Existing reader settings, paragraph-relative resume, literal epilogue filenames, catalogue filters, shared URLs and the authoring workflow remain intact.
- Next.js was updated from the inherited 14.2.35 to 15.5.29 after the dependency check found critical framework advisories. The static page route parameters were adapted to the asynchronous API. React 18 remains compatible with this release's declared peer dependencies.
- The deployment workflow continues to publish only `main`. This feature branch produces a comparison artifact for review.

## Review evidence

Verification ran on 15 November 2026 against the assembled production preview on port 4176.

| Check | Result |
| --- | --- |
| Astro production build and template/types | Passed with 14 files checked and 7 routes generated |
| Next.js production export | All 875 pages exported |
| Original content audit | 889 checks passed across all 50 books and 820 chapter/end routes |
| Portfolio interactions, project dialogs, history, accessibility and fallbacks | 316 checks passed across 14 groups |
| Archive motion, pause/resume, resize, idle/hidden suspension and fallbacks | 46 checks passed |
| Library, book pages, reader, filters, themes, storage and responsive behavior | 102 checks passed |
| Deep paragraph-resume and reader-history regressions | 9 groups passed |
| Supplied MP4 and WebM motion studies | Both decoded completely |
| Production screenshots | 8 captures, no browser page errors |

The tested pages and project dialogs had no automated WCAG A/AA violations. Review included 320px and 390px layouts, reduced motion, disabled JavaScript, unavailable WebGL, reduced data, keyboard focus, modal dismissal and background suspension. A real mid-sequence resume failure and a transient text-contrast problem were corrected and rechecked.

Cold-cache local Chromium measurements used a 390×844 viewport, 4× CPU slowdown, 1.6 Mbps download and 80ms latency.

| Page | LCP | CLS |
| --- | --- | --- |
| Novel library | 1.28s | 0.0178 |
| Chapter reader | 0.668s | 0.0222 |

These local lab measurements describe the tested browser profile. The WebGL code is a large, separately loaded enhancement with gated requests and drawing that stops at rest. The 21st CLI was unavailable in the sandbox's package cache, which prevented its automated review. Verification used source review, production screenshots, browser regressions and axe.

The critical framework advisory is resolved. The package audit still reports noncritical transitive CSS/YAML/tooling advisories for follow-up. Deployment uses a static export.

The production captures and viewport manifest are available in the screenshot gallery. The feature branch is ready for pull-request review. [View all eight screenshots](docs/screenshots/aleem-facets/README.md).
