# Aleem Siddique — Compute Core design system

Chosen before production implementation, 5 October 2026. Direction A from `DESIGN_RESEARCH.md` is the sole production direction.

## Composition

The page is a sequence of precision workbench chapters, not a collection of interchangeable cards. Hero: name and short engineering positioning on the left, owned procedural compute object on the right, restrained chapter/drawing metadata below. Introduction and engineering journey separate the object into its constituent systems. Selected work gives each major project a generous technical surface and a short evidence column. Playground opens the grid into a deliberate, finite collection. About is concise. Contact is a calm resolved ending.

## Colour

| Token | Hex | Purpose |
| --- | --- | --- |
| `--paper` | `#F1F0E9` | Main warm off-white field |
| `--ink` | `#191C1A` | Headings, body text, dark chapters |
| `--muted` | `#646A61` | Secondary text on paper |
| `--line` | `#D2D5CB` | Hairlines and figure rules |
| `--metal` | `#A7ACA2` | Object metal and UI tertiary decoration |
| `--accent` | `#C3E85B` | Sparse data traces, selected index, focus on dark |
| `--accent-ink` | `#344815` | Readable accent text/focus on paper |
| `--dark-muted` | `#ABB4A5` | Secondary text on graphite |

Paper/ink is the default. Use lime as a sparse signal, not a full-screen wash; do not set small lime text on paper. Muted text must pass AA at its actual size; decorative line tokens do not carry meaning. Project colour belongs mainly to the visual itself. Avoid unrelated interface accents, default blue, purple gradients, decorative blur and backdrop glass.

## Typography

Selected family: **Instrument Sans**, variable grotesk, with **IBM Plex Mono** only for figure labels, project numbers and short technology metadata. Instrument Sans gives the editorial name and work headings a precise, open shape while the restrained mono face carries technical captions. Use locally hosted Latin WOFF2 subsets and include their SIL Open Font License files. The implementation sources these families through Fontsource and retains their upstream licenses; do not reuse unidentified existing WOFF2 assets. System fallback: `Arial, Helvetica, sans-serif` and `ui-monospace, Consolas, monospace`. The identity comes from composition, scale and spacing, not a fashionable font alone.

Display name uses 550–650 weight, tight but legible tracking around `-0.065em`, line height `0.88–0.94`, and deliberate line breaks. Desktop name can reach 120–160 px where it fits; mobile name typically 64–78 px at 390 px and 56–68 px at 360 px. Never clip it for effect. Positioning is 22–34 px, medium weight, 1.2 line height. Section titles 44–76 px desktop, 38–52 px mobile. Body 16–18 px, line height 1.55–1.7, measure about 55–68 characters. Mono 11–13 px with modest tracking; readable metadata should not be tiny. One H1, hierarchical H2/H3, no heading chosen only for its size.

## Grid and spacing

Desktop: max content width around 1440 px, 48–72 px outer gutter, twelve columns with 24–32 px gaps. Hero copy occupies 5–6 columns; scene occupies the rest. Project rows prefer 6–7 visual columns and 4–5 evidence columns, with a numbered rail. Avoid enclosing every text block in a card. Fine horizontal rules mark chapters.

Tablet: 32 px gutters and a simplified two-column grid. Mobile: 20–24 px gutters (18 px at the narrowest viewport), one column, generous natural vertical rhythm. Space scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. Chapter padding adapts from 56–72 px mobile to 104–160 px desktop. Establish grouping with space before adding borders.

## Navigation and controls

Light persistent header: compact Aleem/A1E3M signature plus Work, About, Playground and Contact. At narrow widths keep direct readable links where possible; simplify wording or layout rather than burying navigation in decorative gestures. Minimum target about 44 px in height. Header gains a quiet rule/surface on scroll. Anchor positions account for header height. Primary links are plain text with a small arrow or underline. No generic paired hero buttons. Visible focus: 2 px outline with offset, using graphite/green as appropriate to surface.

## Motion contract

Native page scroll is the source of truth. One shared passive-scroll/requestAnimationFrame signal drives object transforms and optional DOM reveals. A single fixed `.core-stage` (around 560×560 CSS pixels on a large desktop) follows reserved `data-core-anchor` boxes in hero, introduction, journey, each selected-work poster, playground and contact. Scene placement is computed from those boxes so the object never covers reading columns. DOM never waits for the canvas. This lightweight arrangement needs no extra animation library; use GSAP only if a necessary timeline exceeds the simple chapter model. Small opacity/translation reveals: 180–400 ms, distance 8–20 px; heading and body remain visible if enhancement fails. Hover transitions 140–200 ms. Core interpolation is damped and restrained. Desktop pointer response is at most a few degrees and disabled for coarse pointers. No automatic carousel, cursor replacement, scroll hijack, entrance countdown or artificial loading ceremony.

At `prefers-reduced-motion: reduce`: static assembled core, no continuous idle animation, no scrubbed explode/reassemble motion, no parallax, native anchors and normal content flow. A tiny fade is optional and must not delay content.

## Core geometry and materials

Procedural identity: one asymmetrical layered assembly with bevelled graphite base, machined silver intermediate plate, recessed charcoal die, etched circuit paths and an optional restrained translucent wafer. No logos, commercial CPU shape or fake brand engravings. Marking may use “AS / CORE 01” or a simple Aleem monogram. Pins and repeated components are instanced. Traces follow purposeful right-angle routes rather than random particle noise. A few lime conductors give the form its technical signal.

Material target: graphite metal roughness 0.28–0.45, silver roughness 0.22–0.38 and higher metalness, wafer opacity around 0.15–0.35 when used. Glass transmission is optional on high tier only; geometry edge separation is sufficient on mobile. Lighting: soft neutral key and fill, a subtle warm/cool difference, no dramatic neon emissive glow. Soft shadow or grounded shadow surrogate should give weight. Prioritise silhouette, visible thickness, bevels and layer separation over shaders or postprocessing.

| Narrative chapter | Object state | Meaning |
| --- | --- | --- |
| Hero | Assembled, isometric, calm | One engineer, multiple connected disciplines |
| Professional statement | Slight rotation, inset traces appear | Look beyond the surface |
| Journey | Base, silicon and wafer separate vertically | Evidence and technical foundations |
| Selected work | Plate orientation changes; sparse per-project surface/index | Different systems built from shared engineering practice |
| Playground | Traces and satellites open into a small wider network | Curiosity extends beyond selected professional work |
| About | Less motion, layers approach alignment | The person behind the systems |
| Contact | Assembly resolves to a stable final form | Clear, confident conclusion |

## Surfaces and case-study visual language

Featured projects are not equal thumbnail cards. Each owns one large technical visual: an actual application screenshot, an honest schematic, a physical prototype photograph or a typographic process figure. Frame screenshots in a simple restrained browser/device outline when it improves legibility. Rendered posters may communicate an abstract system but must never imply an unverified product feature. Use index, project title, role/period metadata, 2–3 sentence context, named technical challenge, contribution/result and a concise stack. Links explicitly say “View source”, “Read project” or “Open experience”. Avoid unverified metrics and badge collections.

Dark project figures can sit on the light editorial page and create chapter rhythm. Thin outlines, technical ticks and short figure captions give consistency. Surface corner radii stay restrained (0–4 px for figures, 6–12 px where a real app screenshot needs a frame). The playground may use a finite 2–3 column thumbnail grid, becoming one or two columns on mobile according to legibility. No auto-scrolling gallery.

## Mobile art direction and fallback

At 360–430 px, the first view reads: compact nav, name, positioning, a substantial 220–300 px core figure and a restrained scroll cue. The mobile scene anchors only to the hero. Subsequent project posters use static SVG or authentic images and selected work reads vertically with image before evidence. The core cannot occlude text or pull content below an unnecessary fullscreen scene. No pinned project track or horizontal progress trap. All controls work without hover. Figure labels can reduce to the useful caption rather than becoming tiny.

High tier: full procedural detail, bounded DPR at or below 1.5, limited optional glass. Medium: fewer repeated parts, no transmission or postprocessing, lower pixel cap. Low: minimal scene or the same static SVG identity. Pause rendering when hidden and when the scene is offscreen; come to rest after scroll settles. Frame-by-frame object mutation stays outside React state. Initial typography and links load before lazy WebGL. A static SVG/image fallback preserves layout and the core's identity; canvas is never the sole carrier of text or important information.

## Production review

Review real screenshots at 360×800, 390×844, 393×873, 412×915, 430×932, tablet and desktop. Capture hero, journey, every selected work chapter, playground, about and contact. Inspect keyboard order, anchor clearance, contrast, reduced motion, no-WebGL fallback, horizontal overflow, link destinations and legacy routes. Run implementation → audit → fixes → second audit. Measure loading and layout shift; profile CPU/frame consistency where browser tooling allows. Do not call these targets achieved without evidence in the QA report.
