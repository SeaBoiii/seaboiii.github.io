# Aleem Siddique — design research and direction

Research date: 5 October 2026. This document precedes production UI. The supplied brief authorizes exploring three directions, critiquing them and choosing one. The selected direction below is the design decision for this implementation; it does not imply user review of rendered production screenshots.

## Repository findings

The root is a legacy static portfolio using Open Sans, a blue accent, oversized stock icons, self-rated skills, long project paragraphs and badge contact links. It contains useful factual evidence for ICM Buddy, Lyon 2.0 and the Probow server. Its biography is time-sensitive and must be rewritten from verified evidence. `img/icm_buddy.gif` and `img/ntu_singapore_onigroup_google_cloud.jpg` can support historical case studies. `images/hub/` includes real site screenshots and SVG marks for Potionality, Classility, the novel hub, Age of War, Nizam, Tetris, Wordle, Visual Novel and MMORPG.

`js/main.js` contains old jQuery scrolling and Minecraft status polling; `js/script.js` belongs to a separate personal page. These scripts are not a foundation for the new portfolio. `web/` is an independent Next.js novel reader and its root page redirects to `/novel/`. The deployment workflow builds that reader, copies static routes and finally restores the existing root. The redesign therefore belongs in an independent `portfolio/` Vite frontend, with `/portfolio-assets/` for built assets. Novel routes and legacy assets remain separate.

## References inspected

References are principles, not templates. Each conclusion marked “design inference” is our interpretation rather than a claim by its author.

| Primary reference | Observed pattern | Design inference for Aleem |
| --- | --- | --- |
| [Gianluca Gradogna on Awwwards](https://www.awwwards.com/sites/gianluca-gradogna-portfolio) (23 January 2025) | Restricted monochrome palette, prominent project gallery, typography and transition studies; desktop and mobile presentations listed separately. | A memorable identity can come from composition and carefully staged work rather than many effects. Keep Aleem's project hierarchy finite and visible. |
| [Gianluca Gradogna case study, Codrops](https://tympanus.net/codrops/2025/01/30/case-study-gianluca-gradogna-portfolio-25/) | Two disciplines unified by typography; motion prototypes precede implementation; transitions built from position, opacity and masks. | Give embedded/AI/web work a shared editorial frame. Avoid reproducing its infinite and horizontal navigation; Aleem's audience needs fast evidence. |
| [Merouane Bali's 3D portfolio, Codrops](https://tympanus.net/codrops/2025/01/21/the-journey-of-creating-a-3d-portfolio/) | Desktop immersion becomes a lighter mobile header with conventional content. React links the scene and interface; asset and usability constraints shape the result. | Mobile needs its own composition. One object, semantic sections and a shared chapter signal are more appropriate than hiding information in a navigable room. |
| [Eduard Bodak's animation case study, Codrops](https://tympanus.net/codrops/2025/07/29/built-to-move-a-closer-look-at-the-animations-behind-eduard-bodaks-portfolio/) | A primary account of scroll-driven and interactive portfolio animation. | Motion should respond to layout and progress rather than run as unrelated ambient decoration. Use a small, coherent set of chapter transformations. |
| [Dennis Snellenberg's current portfolio](https://dennissnellenberg.com/) | A direct professional introduction, a concise recent-work list and a legible contact conclusion. | Visitors should discover positioning, representative work and contact in a short visit. Do not borrow its recognisable portrait-led hero or magnetic-button identity. |
| [Three.js responsive rendering manual](https://threejs.org/manual/pages/responsive.html) | CSS controls canvas dimensions; drawing-buffer resolution and high-DPI cost require explicit handling. | Bound DPR and pixel count. Display-space sizing and camera aspect must remain consistent at every viewport. |
| [React Three Fiber scaling-performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) | Demand rendering, reusable resources, instancing and adaptive quality reduce unnecessary GPU work. | Repeated pins/traces share geometry; the object comes to rest; lower quality changes count and material complexity rather than removing content. |
| [GSAP ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | Scroll progress, scrubbing, media conditions and animation lifecycle are provided by one orchestration system. | Use native browser scroll with one scene signal. Do not add a second smooth-scroll or React animation library for the same job. |
| [21st public component catalog](https://21st.dev/community/components) | Navigation, galleries, timelines and text are explicit pattern categories. | Reference simple navigation, finite galleries and timeline rows; reject template hero, decorative terminal and autoplay marquee patterns. |

## Tooling evidence

The enabled tool catalog did not expose Context7 or a Chrome DevTools connector. Primary Three.js, R3F, GSAP and Motion documentation supplied the technical references. The Browser runtime was initialized and troubleshooting/discovery returned no connected browser, so local Playwright Chromium and its CDP performance/network APIs handled rendered QA.

The production scroll controller deliberately uses passive native-scroll listeners and one scheduled animation-frame signal, rather than adding GSAP or Motion. This page needs chapter progress, reserved figure anchors and modest pose interpolation, without a pinned scrolling engine. The same mutable signal updates DOM navigation/progress and demand-rendered scene transforms; it avoids animation-library overlap and React state updates per frame. Reduced motion preserves native flow and a stable assembled form.

Read the `21st-ui-explore` and `21st-cli-use` skills. Attempted `npx --yes @21st-dev/cli search 'editorial portfolio' --limit 3 --json` and an editorial typography/navigation query. Both returned `Not signed in. Run 21st login or set TWENTYFIRST_TOKEN.` The public catalog was readable. No credentials were requested, no hosted generation was called, no catalog code is represented as retrieved, and no random component dependencies were installed. Comparable studies are hand-built HTML/SVG informed by the references above. Context7 availability is checked by the implementation team; primary documentation remains authoritative.

## Fixed constraints across all three studies

Real identity and verified projects; React/Vite; DOM text; one procedural 3D object; persistent Work/About/Playground/Contact anchors; keyboard focus; native scroll; reduced motion; static fallback; no employer secrets; no invented outcomes; no photo-led or template hero. Same candidate content and the same approximate hero/case-study viewport are used so the choice compares composition rather than copy quality.

## A — Precision / The Compute Core

**Idea:** An engineered object on an editorial workbench. A calm, oversized name and positioning statement establish the person; a machined layered core demonstrates the systems beneath the work. Visitors feel precision and curiosity before reading the details.

**Composition and interaction:** Warm light field; graphite typography; asymmetric 12-column grid. The core sits to the right with short drawing-style labels. Scrolling reveals its layers through career, presents project-related surfaces during work, opens into a trace network at playground and settles at contact. Work chapters are large image/instrument surfaces with concise evidence beside them. Navigation stays visible.

**References and continuity:** Codrops' DOM/scene separation and simpler mobile model; Awwwards' restrained typography and finite gallery emphasis; 21st timeline/gallery/navigation categories; the repository's embedded lens controller and engineering/AI projects. Retain only the recognisable Aleem/A1E3M signature and evidence, not the old page hierarchy.

**Risks:** A small or flat chip can look like a generic technology icon. Mitigate through a bevelled graphite frame, silver edges, asymmetrical inset die, a visible spacer layer and sparse lime traces. Hero labels must remain secondary. Desktop canvas must never reduce text contrast. Mobile uses a hero-size object and normal project flow.

**Best fit:** A practising engineer with work across hardware constraints, AI and useful software. Strongest connection to the supplied narrative.

## B — Spatial / Engineering Archive

**Idea:** A navigable collection of engineering specimens. Projects are independent panels orbiting a quieter central structure; work is the first thing a visitor sees.

**Composition and interaction:** Dark graphite stage; dispersed project specimens arranged in a generous coordinate grid; project-led landing; a slim numbered archive rail; selecting a panel expands a DOM case study. The core becomes a connector among projects rather than the main protagonist. Mobile translates the archive into a list, losing the spatial relation.

**References and continuity:** Merouane Bali's scene/interface communication; 21st galleries and navigation; existing project-hub thumbnails. The same verified projects, identity and contact remain.

**Risks:** The archive requires stronger visual assets than all public projects currently provide. Spatial navigation can hide the engineer's role, cause crowded mobile controls and multiply draw calls. A DOM list is mandatory, which weakens the concept on phones. More likely to date as a “3D portfolio” style.

**Best fit:** A creative developer with many visually exceptional interactive commissions. Less appropriate for Aleem's mixed practical engineering evidence.

## C — Editorial / Reactive Instrument

**Idea:** A rigorous engineer's field journal. Typography and case-study argument lead; a small reactive geometric instrument measures the reader's progress.

**Composition and interaction:** Split-column print-like layout; name in a horizontal masthead; positioning occupies most of the first viewport. Work appears as numbered editorial spreads with diagrams and technology footnotes. Core is small and isolated in the margin, changing orientation and engraved marks with each chapter. Mobile preserves the exact reading logic.

**References and continuity:** Dennis Snellenberg's direct professional hierarchy, Codrops' elementary transitions, 21st text/timeline patterns and the repository's factual project descriptions. Required content is unchanged; the object takes a supporting role.

**Risks:** Excellent readability and longevity, but the small object gives the Compute Core less narrative agency. Can appear conventional if case-study visuals remain screenshots in rectangles. Needs editorial writing and strong diagrams to become memorable.

**Best fit:** A senior consultant or research engineer whose primary differentiator is depth of written expertise.

## Critique against the brief

Scores below are design judgement, on a 1–5 scale, not measured usability or performance results.

| Criterion | A: Compute Core | B: Spatial Archive | C: Editorial Instrument |
| --- | --- | --- | --- |
| Professionalism | 5: precision without theatrics | 4: scene competes with identity | 5: strong reading hierarchy |
| Memorability | 5: owned engineered object | 5: strong spatial first impression | 3: depends on excellent editorial work |
| Clarity | 5: name, statement and chapter anchors | 3: needs archive instructions | 5: direct sequence |
| Engineering identity | 5: layered systems narrative | 4: project network is relevant | 4: instrument feels analytical |
| Mobile quality | 5: object + vertical chapters | 3: spatial logic collapses | 5: reading order transfers naturally |
| Performance | 4: bounded scene complexity | 2: several project surfaces | 5: small, quiet scene |
| Accessibility | 5: conventional DOM and anchors | 3: coordinate selection risk | 5: minimal interaction dependency |
| Longevity | 5: materials and typography | 3: immersive archive trend | 5: editorial structure |
| Total | **39/40** | **27/40** | **37/40** |

## Decision

Choose **A: Precision / The Compute Core**. It earns the object a purpose and relates directly to constrained embedded work, AI experiments and constructed web systems. The primary tradeoff is more rendering work than C; procedural geometry, limited draw calls and a static alternative control that cost. B's discovery model is too indirect for a recruiter or engineering leader spending sixty seconds on the site. C remains a separate rejected direction; its small instrument and journal composition are not blended into A.

The implementation should be recognised through the same layered core, quiet bone/graphite field, numbered evidence and precise typographic relationships. It must not become a dark SaaS page with a chip dropped into the hero. Read `DESIGN_SYSTEM.md` before components. `directions.html` is the comparable exploratory artifact, retained as design documentation rather than shipped production variants.

## Acceptance and review lens

The first viewport identifies Aleem before a scene loads. Four selected work chapters disclose context, contribution, technical challenge and result. A visitor can jump to work and contact immediately. A phone gets a deliberately composed hero and vertical project rhythm. The scene changes for each major narrative chapter but never carries unique facts. Reduced-motion, no-WebGL and JavaScript-disabled presentations remain professional. Real browser screenshots, route checks and measured performance determine acceptance; these study scores do not substitute for that audit.
