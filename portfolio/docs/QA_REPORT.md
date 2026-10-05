# Portfolio QA report

Reviewed on 5 October 2026, on `redesign/compute-core`. The assembled production artifact was served at `http://127.0.0.1:4173`. No deployment, push or merge was performed during QA.

## Coverage and outcome

The second complete browser audit passed **16 of 16 scenarios** and produced **146 screenshots**. These cover the hero, engineering journey, all four selected projects, playground, about and contact, with full-section captures where content exceeds the viewport.

| Profile | Coverage |
| --- | --- |
| Desktop | 1440 × 1000 |
| Phones | 360 × 800, 390 × 844, 393 × 873, 412 × 915, 430 × 932 |
| Tablet | 1024 × 768 |
| Reduced motion | Desktop and 390 × 844 |
| Explicit static quality | Desktop and 390 × 844, using `?quality=static` |
| Actual WebGL unavailable | Desktop and 390 × 844, blocking WebGL context creation before application code |
| Constrained mobile | 393 × 873, CPU slowdown ×4, 4 Mbps download / 1 Mbps upload / 100 ms latency |
| JavaScript disabled | Desktop and 390 × 844 |

The fourteen JavaScript-enabled profiles passed axe's automated WCAG 2.1 AA checks with **zero violations**, and reported **zero console errors, failed requests or HTTP error responses**. All profiles passed horizontal-overflow checks. The no-JavaScript profiles verified the server-rendered identity, journey, all four case studies, playground, about, contact, working source/email links, and exactly one main content region. Their screenshots show the authored static core and complete page rather than a duplicated fallback biography.

Keyboard checks cover the visible skip link, navigation destinations, playground category filtering and restoration, native technical-detail disclosure, core disclosure, and the ICM Buddy prototype/diagram controls. Mobile primary navigation has 44 px target heights. Visual inspection led to larger phone navigation text, readable project metadata, visible contributions, clearer screenshot crops and authentic prototype imagery.

## Implementation → audit → fixes → second audit

The first complete audit produced **107 screenshots across twelve profiles**. It already had no axe, overflow, console or network failures. One desktop rest assertion sampled the core 600 ms after focusing it from a distant section; native smooth scrolling was still in progress. The audit was corrected to wait for scrolling to stop before measuring rest. This was an audit timing issue, not evidence of an endless animation loop.

The implementation then improved navigation/metadata legibility, moved each contribution into the visible case-study copy, added a real ICM Buddy prototype photograph with an accessible diagram alternative, replaced large legacy PNG loads with small WebP derivatives, provided a real PNG social card, prerendered the complete semantic page for search and no-JavaScript browsing, and checked GPU availability before importing the scene bundle. Existing source images and legacy URLs remain untouched.

The second audit reran every requested phone size and desktop, and added tablet, constrained-network and no-JavaScript coverage. It passed all sixteen profiles. The 21st deterministic source review covered ten files with **zero errors and zero warnings**. Its sixty informational suggestions concern fixed colours in illustrations/materials and token declarations; these are intentional project art and the documented palette, rather than proven usability defects.

## Loading and interaction measurements

These are local synthetic observations, not field Core Web Vitals.

| Second audit profile | Initial-view LCP | CLS | Worst observed audited interaction |
| --- | ---: | ---: | ---: |
| Desktop 1440 | 176 ms | 0.0015 | 80 ms |
| Mobile 360 | 448 ms | 0 | 88 ms |
| Mobile 390 | 512 ms | 0 | 128 ms |
| Mobile 393 | 480 ms | 0 | 96 ms |
| Mobile 412 | 604 ms | 0 | 184 ms |
| Mobile 430 | 440 ms | 0 | 112 ms |
| Tablet 1024 | 108 ms | 0.0019 | 64 ms |
| Constrained mobile 393 | 776 ms | 0 | 80 ms |

Initial LCP is sampled before the audit scrolls through the page. In the constrained-network profile the LCP element was the identity `h1` at 776 ms; the lazy scene download started at 1,606 ms and completed about 2.2 seconds later. Readable content therefore did not wait for WebGL. The captured waterfall includes script, CSS, local fonts, the deferred scene and lazy case-study images.

The local server transferred **1,405,657 bytes** over a full enhanced-page exploration, compared with **3,710,015 bytes** in the first audit: approximately **62% less**. Explicit static and unavailable-WebGL profiles transferred **480,621 bytes**, compared with 2,785,583 bytes for the earlier static profile. These values include uncompressed local script responses and resource overhead; they are not a claim about GitHub Pages' final compressed transfer. Nine generated media derivatives total 142,756 bytes. Fonts are local Latin WOFF2 subsets with their licenses retained.

The constrained profile's Chrome performance counters recorded approximately 1.21 seconds of script execution across the entire audit and a final 15.8 MB JavaScript heap. These include repeated navigation, filtering, disclosures, screenshots and the synthetic scroll probe; they are not initial-load-only CPU figures. The lazy Three/Fiber scene remains the largest code payload at roughly 925 KB before HTTP compression, so it is explicitly excluded from the readable-content dependency path and avoided for unavailable GPUs, low-resource conditions and static quality.

## Rendering, motion and performance limits

The inspected scene uses one demand-rendered canvas, instanced repeats, bounded DPR, a few generated textures, and no shadow maps, postprocessing or transmission. Its generated texture inputs are a 512 × 128 label, a 128 × 128 grounding image, and an environment generated at cube resolution 128 for high quality or 64 for medium. Desktop diagnostics recorded fourteen draw calls, 3,216 triangles and DPR 1 in this test environment; the scene reached its resting state after scrolling and the disclosure animation settled.

Resting browser RAF timing was approximately 16.7 ms. A deliberately driven one-second scroll sweep measured desktop WebGL median/p95 around 33.3 ms, compared with about 16.7 ms in the static desktop profile. Phone sweeps varied between 16.7 and 33.3 ms median with p95 values around 33–50 ms. These results disclose rendering/main-thread cost; **they do not establish universal 60 fps WebGL**, GPU utilisation, or physical-phone frame consistency. The sweep forces scrolling from JavaScript and can add scheduling/layout overhead of its own.

The final narrow audit, after the hero spacing, diagram-label and demand-render invalidation fixes, passed **four of four desktop/mobile standard and reduced-motion profiles**, producing eighteen further captures. The QA instrument counts actual WebGL draw commands. Both reduced-motion scroll probes recorded **zero draw commands**; both resting counters remained unchanged. Final mobile 390 scroll median/p95 improved to approximately **16.7 ms**. Final desktop enhanced scroll remained around 33.3 ms median / 50 ms p95; this remaining software-rendering cost is disclosed rather than presented as a 60 fps result.

A separate lifecycle probe passed desktop and mobile. Resting counters stayed at 60 → 60 and 58 → 58, respectively. With the canvas actually offscreen in the lower playground, counters stayed at 74 → 74 and 58 → 58. Returning to the hero restored the visible scene. An explicit simulated document-visibility event paused drawing even when pointer input was sent, and restoration returned the visible scene. Headless tabs kept `document.hidden` false during tab switching, so the visibility test is specifically **an application-handler simulation**, not a native background-tab measurement. The updated Fiber canvas disables default scroll remeasurement because the external stage owns position; real size changes remain observable.

Chrome's `SystemInfo.getInfo` identified **ANGLE/Vulkan SwiftShader**, a software GPU renderer, for this audit. The WebGL was real and its rendering calls were measured, but its execution was software rasterization. These timings therefore establish behavior on this browser environment and do not predict hardware GPU utilisation or physical phone battery use.

## Route and asset preservation

The portable assembly/verification pipeline checked all **50 novel overviews and 820 chapter/epilogue routes** and compared **2,609 preserved reader/static files** against their sources. The portfolio overlays only the root landing and its isolated `portfolio-assets/` namespace. Standalone HTML pages, their scripts/styles/fonts, the reader's `_next` files, original images and 404 behavior are retained.

Live read-only HEAD requests returned 200 for the eight separate mini-project deployments, the three standalone pages, the novel index and a sample chapter. A separate check returned 200 for all featured source repositories, the live robotics/Classility experiences, the exact ICM report link, and the additional Build a PC, Our Flight and PropHunt sources. This establishes availability at review time, not control over independently hosted projects.

## Reproducing and interpreting the evidence

From `portfolio/`, run `npm run qa -- http://127.0.0.1:4173 second` for the complete suite, `npm run qa -- http://127.0.0.1:4173 final targeted` for the narrow final check, or `node qa/visibility-check.mjs http://127.0.0.1:4173` for lifecycle/draw-count evidence. Ignored artifacts live in `portfolio/qa/artifacts/<pass>/`: screenshot PNGs, per-profile JSON with findings/waterfalls/Chrome counters, and `summary.json`; the lifecycle evidence is `final/visibility-check.json`. The standalone browser was used after the Browser runtime found no available browser.

Automated axe checks supplement manual semantic, keyboard and screenshot inspection; they are not a complete accessibility certification. Observed event durations are sampled interaction latency rather than field INP. Headless Chromium with viewport and CPU/network emulation is not a physical device. Real mobile GPU, touch feel and deployed-network checks remain useful follow-up evidence. No deployment or main-branch change is authorized by the audit itself.
