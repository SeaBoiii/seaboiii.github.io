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
| Astro production build and template/types | Passed with 21 files checked and 7 routes generated |
| Next.js production export | All 875 pages exported |
| Original content audit | 889 checks passed across all 50 books and 820 chapter/end routes |
| Portfolio interactions, project dialogs, history, accessibility and fallbacks | 412 checks passed across 17 groups |
| Archive motion, pause/resume, resize, idle/hidden suspension and fallbacks | 46 checks passed |
| Library, book pages, reader, filters, themes, storage and responsive behavior | 102 checks passed |
| Deep paragraph-resume and reader-history regressions | 9 groups passed |
| Supplied MP4 and WebM motion studies | Both decoded completely |
| Production screenshots | 21 captures, no browser page errors |

The tested pages and project dialogs had no automated WCAG A/AA violations. Review included 320px and 390px layouts, reduced motion, disabled JavaScript, unavailable WebGL, reduced data, keyboard focus, modal dismissal and background suspension. A real mid-sequence resume failure and a transient text-contrast problem were corrected and rechecked.

Cold-cache local Chromium measurements used a 390×844 viewport, 4× CPU slowdown, 1.6 Mbps download and 80ms latency.

| Page | LCP | CLS |
| --- | --- | --- |
| Novel library | 1.28s | 0.0178 |
| Chapter reader | 0.668s | 0.0222 |

These local lab measurements describe the tested browser profile. The WebGL code is a large, separately loaded enhancement with gated requests and drawing that stops at rest. The 21st CLI was unavailable in the sandbox's package cache, which prevented its automated review. Verification used source review, production screenshots, browser regressions and axe.

The critical framework advisory is resolved. The package audit still reports noncritical transitive CSS/YAML/tooling advisories for follow-up. Deployment uses a static export.

The production captures and viewport manifest are available in the screenshot gallery. The feature branch is ready for pull-request review. [View all twenty-one screenshots](docs/screenshots/aleem-facets/README.md).

## Independent Work follow-up

The library project was still presenting a capture from the older interface. Its shared evidence image is now `novels-archive.webp`, captured directly from the current production library at 1280×800. A new asset URL refreshes cached previews. The homepage, project dialog and compatibility case study all use it.

The library demonstration now combines that interface with three physical volumes using the actual featured covers. Each has front, rear, spine and paper surfaces. Each cover is an ordinary reading link with its title below. Flow-based sizing reserves room for the books and captions on narrow screens. Outward-facing rear covers prevent the dark back surfaces from obscuring front artwork.

All six featured demonstrations now use physical depth. Shallow extruded display surfaces carry the existing videos and screenshots, while the library uses books in front of its interface. Native chapter events drive yaw and depth as projects pass through the viewport. Fine-pointer input adds bounded perspective to the active project. The library volumes also separate and turn with project travel. Story copy stays on a steady reading plane.

This chapter uses CSS 3D and input-only updates. It adds zero animation loops, scroll listeners, WebGL canvases or paid generation jobs. Modal opening freezes the current display and book transforms. Reduced motion, paused motion and reduced data use static display planes. Existing video controls, project jumps and reading links remain directly usable.

The follow-up passed all 329 portfolio browser checks across 15 groups with zero page errors or automated accessibility violations. These cover the six surfaces, three book links, current shared image, scroll and pointer matrices, exact modal freeze, pause/resume and reduced-motion/data fallbacks. Desktop and 320px/390px screenshots were reviewed. The local 21st review ran successfully and reported informational material-colour findings. Its catalog search requires authentication, so this implementation reuses the existing project primitives.

## Crosswinds in Sapa follow-up

The user selected an update to Crosswinds' portfolio presentation. Its stage now uses the original prologue artwork behind an offset carbon story panel. Literata, warm silver, copper edges and restrained perspective connect the narrative project to the novel collection and the rest of Independent Work.

The panel contains the verified Memory Load excerpt and its single opening choice. These give visitors a readable sample of the story. An explicit Play the story link opens the existing playable experience. The homepage, popout and standalone case study share one component and the same source artwork.

The source artwork and passage were verified at `SeaBoiii/visual_novel` commit `c150995bd455c3218efe225c4f5a7328c6e912de`. The 1.7 MB original image was encoded as a 135 KB WebP for this presentation. CSS supplies the layered scenery and uses the existing project rail's scroll and pointer values. It settles with input and freezes behind dialogs. The asset record includes the original hash and pinned source links. [Source and provenance](showcase/ASSETS.md).

All 345 portfolio browser checks passed across 16 groups, with zero page errors or automated accessibility violations. Crosswinds-specific checks cover the authentic passage and choice, launch link, scroll/pointer transforms, keyboard focus, modal freeze, shared case study and 320px/390px layouts. Desktop screenshots include the 1024×768 pinned layout. The local 21st review reported informational colour findings for the authored materials.

## Remaining featured project presentations

The user requested the same visual treatment for ICM Buddy, Train a Tiny AI, AI Rover Challenge and Classility. Each now connects its subject to the portfolio's carbon, warm silver and copper materials.

- ICM Buddy pairs its actual mechanism footage with an original focus-and-zoom photograph. The physical print shows the photographic result of the engineering work.
- Train a Tiny AI uses four groups of coloured example tiles converging on a classifier and output node. These explain the visitor-trained Color Mixer recording alongside it.
- AI Rover Challenge uses a dimensional virtual rover, wheels, sensor arcs and a ground grid beside its actual simulation recording. The accompanying HTML describes the control loop.
- Classility pairs its real quiz walkthrough with the original Paladin illustration on a physical card. The card provides a direct link to the verified archetype page.

The ICM photograph and Classility artwork were verified against their source commits and optimized for this presentation. Their hashes and pinned source links are in the asset record. [Asset provenance](showcase/ASSETS.md).

The shared ProjectPreview renderer selects the same subject presentation for the homepage, popout and standalone case study. It reuses the existing video component, motion preference, native chapter values and modal suspension. CSS geometry supplies the Tiny AI and rover illustrations with input-only updates. The four working recordings retain their native controls, source formats and playback management.

Browser hit testing found two initial video planes behind transparent ancestor hit planes. Positive depth puts the complete interactive surface in front, while preserving the dimensional composition. Tests then verified control access on desktop and phones alongside exact modal freeze and background video suspension. The local 21st review completed with informational material-colour findings.

All 412 portfolio checks passed across 17 groups with zero browser errors and automated accessibility violations. The four shared popouts passed accessibility checks. Control-strip hit tests passed at desktop, 320px and 390px widths. Visual review also covered 1024×768 layouts. The review gallery includes desktop and phone captures for all six featured projects. Video captures use fixed positions within the original supplied recordings.
