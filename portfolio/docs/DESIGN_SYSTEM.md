# Aleem Siddique — Compute Core, second edition

User-approved revision, 5 October 2026. This contract supersedes the first edition's travelling canvas, chapter-driven poses and mostly monochrome sections.

## Composition and colour

The page reads as identity → expanding core → four selected case studies → AMD collection → engineering journey → toolkit → playground → about → contact. The opening identity is spacious type and a concise statement. The graphite core chapter introduces the connected disciplines. Project stories pair large, evidence-based visuals with context, contribution, constraints and results. Colour creates distinct landmarks: vermilion for the AMD collection, cobalt for the playground, graphite for the closing invitation.

| Token | Hex | Purpose |
| --- | --- | --- |
| `--paper` | `#F1F0E9` | Warm off-white page and header |
| `--ink` | `#191C1A` | Body text and graphite sections |
| `--muted` | `#646A61` | Secondary text on paper |
| `--line` | `#D2D5CB` | Fine rules on paper |
| `--accent` | `#C3E85B` | Restrained lime traces and selected core stage |
| `--accent-ink` | `#344815` | Readable focus/accent on paper |
| `--vermilion` | `#C7382A` | AMD collection and identity punctuation |
| `--cobalt` | `#284BE8` | Playground and selected editorial emphasis |
| `--on-color` | `#FFFFFF` | Text on vermilion and cobalt |

Secondary text on graphite uses `#BCC1BC`; secondary playground text uses `#E2E7FF`. Test text against its actual surface. Paper's muted token must not leak into coloured sections. Lime is a sparse signal, not body text on paper. Use deliberate flat section fields, material detail and space rather than decorative blur or unrelated gradients.

## Typography, grid and controls

**Instrument Sans Variable** carries identity, headings and reading text. **IBM Plex Mono** is reserved for short captions, project numbers and metadata. Both use self-hosted Fontsource WOFF2 files with SIL Open Font License copies. System fallbacks are Arial/Helvetica and Consolas/monospace.

The name uses explicit line breaks, weight 550 and tight tracking. Desktop reaches 184 px where space permits; mobile is around 80 px at 390 px width. Section headings range from 40–80 px; reading text is generally 15–17 px with comfortable line height. Keep one H1 and semantic H2/H3 relationships. Do not use a heading merely to obtain a font size.

Content uses a 1560 px maximum with a fluid outer gutter; mobile gutters are 20–24 px. Desktop case studies have a large visual and readable evidence column. AMD cards are four columns on large screens, two on tablet/mobile and one at the narrowest width. The six-project playground uses three columns on desktop and two on mobile. Let content and links wrap without cropping or horizontal scrolling.

The persistent paper header contains identity, four direct navigation links, and the optional sound control. It is 88 px tall on desktop and 72 px on mobile. Below 480 px, the identity wordmark yields space to navigation and the icon-only sound control; its accessible name remains. Interactive controls have a 44 px minimum height. Visible outlines adapt to light, dark and coloured backgrounds. Anchor offsets account for the header.

## Continuous core sequence

One locally sticky `.core-story` owns the scene. Standard desktop allocates 300svh; mobile allocates 220svh with the scene limited to 40% of viewport height. Short-height and reduced-motion layouts return to normal flow so the diagram, explanations and project link remain reachable.

| Stage | Visible action | HTML explanation |
| --- | --- | --- |
| Hardware | The cover rises from the assembly | Mechanisms, circuits and precise control |
| Intelligence | Die and intermediate layers separate | Models that learn, predict and respond |
| Interaction | Connections and signal endpoints appear | Interfaces that put people in control |

Native scrolling produces one normalized, reversible progress value. Smooth interpolation drives every layer from that scalar without overshoot. The camera orientation and scene bounds remain stable; pointer movement and section navigation do not alter the pose. Motion finishes before the end of the sequence, leaving a short expanded hold. The whole section then scrolls away before selected work. There is no scroll hijacking, travelling stage, manual explode toggle, pinned project gallery or automatic camera rotation.

The object is original procedural geometry: a bevelled base, silver frame, red silicon, translucent cover, cobalt circuit detail and sparse lime contacts. Repeated pins and components are instanced. Materials and an internally generated studio environment supply depth without external models or postprocessing. An authored exploded SVG preserves the same idea when enhanced graphics are unavailable.

React Three Fiber uses demand rendering. Mutable frame state stays outside React; geometry and materials are reused. High tier caps DPR at 1.5, medium tier uses DPR 1 and less detail. Offscreen and hidden scenes stop requesting frames, and visible animation rests after interpolation settles. The engine is lazy-loaded only for eligible devices; static mode, data saving, reduced motion and unavailable WebGL retain the fallback and semantic content. HTML labels carry the meaning, not the canvas.

## Project and asset treatment

Tiny AI, Rover, ICM Buddy and Classility remain the four detailed cases. Their visuals use authentic project images or honest diagrams and never imply unverified features or outcomes. The separate AMD collection contains all four `amd_` repositories. Its prominent figures describe documented product structure (900-point budget, 16 archetypes, five missions, drawing/teaching/testing), not user or performance metrics. Tiny AI/Rover collection entries link to their cases; only verified live deployments get “Try it” links. The collection wording is AMD-inspired, without an employer or endorsement claim.

About includes an original generated exploded-module still. It is editorial illustration rather than evidence of a commercial device. The tracked PNG and provenance live under `assets/images/`; `prepare-media.mjs` derives the 1200 px transparent WebP. Existing real project screenshots remain intact. No image-generation API is used during build or runtime.

## Optional sound

“Quiet mechanisms” is a single 60-second requested instrumental generated through ElevenLabs `music_v2_5`, with an approximately 80 BPM minimal-electronic direction: rounded pulses, warm pads and sparse mechanical percussion, without vocals or dramatic drops. The 128 kbps MP3 is approximately 0.96 MB. Prompt/model/output metadata is tracked with the audio under `assets/audio/`; the media script copies the finished local file into build output.

Every visit starts off. No audio source or media request is attached until a deliberate button activation. A native HTML audio element loops at volume 0.25. The control reflects actual playback with `aria-pressed`, exposes loading/error feedback, supports cancellation and retry, and pauses on hidden/page-exit/unmount. Returning to the page requires another click. Sound does not affect scrolling or rendering and is never required to understand the site.

## Review and delivery

Use the installed frontend-design and ElevenLabs music guidance alongside existing 21st build/review skills. Catalog authentication remains unavailable; the implementation does not claim catalog retrieval or hosted 21st generation. Check React Three Fiber decisions against [official performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

Validate desktop, tablet, narrow mobile, short portrait and landscape; capture intermediate chip expansion and forward/reverse/rapid scrolling, resizing and orientation changes. Check static, reduced-motion, save-data, missing-WebGL, context-loss and JavaScript-disabled cases. Verify keyboard focus, anchor clearance, contrast, zoom/reflow, overflow and errors. Confirm zero initial audio requests, manual playback controls and interruption/error behaviour. Rebuild and verify preservation of novel/chapter/legacy routes. Record actual results and limitations in `QA_REPORT.md`; this design contract does not itself claim tests have passed. Changes remain on the review branch until the deployment workflow is approved.
