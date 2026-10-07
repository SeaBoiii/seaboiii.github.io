# Asset provenance and generation budget

Assets belong to this portfolio unless a source below says otherwise. Generated studio visuals illustrate the portfolio's camera / engineering / writing themes; they do not depict AMD products or establish project results.

## Sources

| Files in `public/showcase-assets/media/` | Source and treatment |
| --- | --- |
| `icm-prototype.webp` | Existing photograph of the ICM Buddy prototype, copied from `portfolio/public/portfolio-assets/media/`. Visually inspected before reuse. |
| `icm-demo.mp4`, `icm-demo.webm` | Actual prototype footage from the repository's `img/icm_buddy.gif`, transcoded into silent H.264/VP9. No generated hardware footage. |
| `portrait.webp` | Original `img/a1e3m.jpg`; re-encoded to WebP without altering appearance or background. |
| `classility.webp`, `classility-demo.mp4`, `classility-demo.webm` | Fresh 1280×800 browser capture of [Classility](https://seaboiii.github.io/classility/), 2026-10-07. The recording opens the doors, answers twenty questions, and reaches the actual Paladin result. |
| `rover.webp`, `rover-demo.mp4`, `rover-demo.webm` | Fresh browser capture of [AMD AI Rover Challenge](https://seaboiii.github.io/amd_robotics/), 2026-10-07. Demonstrates local team setup, rule editing, the first movement simulator, and genuine failed-mission feedback. The clip deliberately preserves the observed outcome; it does not claim a completed mission. This is a browser simulation, not physical robot footage. |
| `tiny-ai.webp`, `tiny-ai-demo.mp4`, `tiny-ai-demo.webm` | Fresh local browser capture of the owner's public [Train a Tiny AI source](https://github.com/SeaBoiii/amd_trainatinyai/tree/315251c5c586de4a7da5f3503ad70e3d3d83e994), 2026-10-07. Demonstrates the Color Mixer Lab: eight user-supplied examples across four labels, then a real classifier prediction. No NPU benchmark or fabricated accuracy claim. The public Pages URL returned 404, so the original source was served locally without content edits. |
| `potionality.webp`, `novels.webp`, `visual-novel.webp`, `nizam.webp`, `tetris.webp`, `age-of-war.webp`, `aleem.webp` | Existing photographs and real project screenshots copied from `portfolio/public/portfolio-assets/media/`, visually inspected before reuse. Their original capture dates are unknown. |
| `workbench-film.mp4`, `workbench-film.webm`, `workbench-film-poster.webp` | One eight-second 1280×720 Gemini Omni studio illustration, generated on 2026-10-07. MP4 compressed to H.264, WebM to VP9, unexpected source audio removed, poster extracted at one second. The camera moves subtly; the ends are not frame-identical, so use normal playback rather than advertising a seamless loop. |
| `workbench-poster.webp` | A capture of the actual website's procedural 3D scene. Used as the SSR, reduced-data, and unavailable-WebGL fallback. |
| `workbench-render.mp4`, `workbench-render.webm` | Deterministic capture of the actual React Three Fiber scene, produced by `scripts/render-workbench.mjs`; this is authored procedural 3D rather than an AI video. |
| `social-card.jpg` | Social preview composed from the real workbench render and the website's fonts by `scripts/social-card.mjs`. |

## Provider usage

Combined authorized maximum: **US$30**. Gemini Omni maximum: **SGD$28**. Only one paid generation was made; no paid retries, edits, extensions, or model substitutions were made.

| Provider | Result | Usage / estimated cost |
| --- | --- | --- |
| OpenAI Images | One attempted `gpt-image-2.5-sunburst-2026-09-08` generation through the bundled ImageGen CLI. HTTP 401 invalid environment credential; no image returned. | No successful generation; estimated image cost US$0. The CLI does not expose token usage. Do not treat the supplied environment key as verified. |
| Google Gemini | `gemini-omni-1.1-flash`, one 8-second 720p generation, completed. Read-only model listing authenticated first. | Response reports 174 input tokens, 46,336 video output tokens, 47,137 total output tokens, and 525 thought tokens. Video cost: `46,336 × US$17.50 / 1,000,000 = US$0.81088`. Including text/input/thinking gives about **US$0.83**, subject to provider billing interpretation. A conservative **US$1 / SGD$2 accounting reservation** covers this run; SGD$2 is a budget allowance, not a claimed exchange-rate conversion or invoice amount. |

Current estimate: **about US$0.83 combined**, with **SGD$2 reserved** against the SGD$28 Gemini cap. Provider billing is authoritative. Sanitized provider usage and prompts are preserved in `scripts/media-usage.json`; credentials and raw model responses are never part of deployed assets.

Prices checked against official [Google pricing](https://ai.google.dev/gemini-api/docs/pricing) and [OpenAI image model documentation](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst). Omni uses the official [Interactions schema](https://ai.google.dev/api/interactions-api) and [video generation guide](https://ai.google.dev/gemini-api/docs/omni).

## Reproducing media

Run scripts from the repository root after installing the `showcase` dependencies. They use hidden headless Chromium and local ffmpeg; no website credential or production runtime API is needed.

```powershell
node showcase/scripts/media-optimize.mjs
node showcase/scripts/media-omni-optimize.mjs
node showcase/scripts/media-tiny-source.mjs
cd showcase/qa/tiny-source
npm ci --ignore-scripts
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4188
# In a second terminal at the repository root:
node showcase/scripts/media-projects.mjs classility rover tiny-ai
node showcase/scripts/media-check.mjs
```

`media-tiny-source.mjs` downloads only public source/config/model files into ignored QA scratch space. It records the source commit and does not deploy this separate application. Project recordings use actual controls and native keyboard interactions. Browser captures are silent, 1280×800 at 24fps, with H.264/VP9 and posters; generated footage is 1280×720 at 24fps. No background music was added.

The Gemini generator is offline only. It requires an explicit `--key-file <local-path>` and `--generate` flag, reads the file solely as credential data, uses headers rather than a credential URL, and prints only safe statuses and usage. A generation marker prevents accidental repeat requests. Any future new paid run needs a deliberate budget review and removal of the marker/output; there is no automatic retry.

The final OpenAI prompt is saved in `scripts/media-workbench-prompt.txt` (not used because authentication failed). The successful Gemini prompt is saved alongside sanitized usage in `scripts/media-usage.json`.

## Generated-video prompt

> Create an eight-second seamless silent 16:9 loop in a single continuous unbroken scene, no scene cuts. A refined creative engineering workbench on a cool off-white cyclorama (#F7F9FC): three distinct objects arranged in a spacious sculptural still life, a graphite camera lens with finely ribbed focusing ring and blue coated glass, a teal printed circuit module with silver traces and a small blank graphite compute chip, and a slim cobalt-blue clothbound book with cream pages and no text. Realistic materials and beautifully restrained product visualization, soft daylight, subtle shadows, white studio mood. Camera makes one very slow tiny clockwise orbit and returns to its starting position by the end. Objects remain perfectly rigid and still. No people, no hands, no letters, no logos, no interface, no extra objects. No dialogue, no music, no sound effects.

The generated result was inspected at 1, 4, and 7 seconds. It preserves the intended three objects and restrained palette; it does not return to precisely the original framing. The implementation therefore does not claim a seamless generated loop.

All supplied MP4/WebM files passed complete ffmpeg decoding. Fresh project posters and stable recorded results were visually inspected. The actual scene's render is also verified by the workbench pipeline.

## Cinematic revision

The `revamp/cinematic-dark` version uses the same paid provider outputs and incurs **no additional generation spend**. Its macro lens, circuit and opening book are authored Three.js geometry with local lighting and textures. Updated `workbench-poster.webp`, `workbench-poster-mobile.webp`, `workbench-render.mp4`, `workbench-render.webm` and `social-card.jpg` are captures of that scene. The mobile poster uses a centred composition rather than cropping the desktop scene.

All twelve marks under `public/showcase-assets/logos/` are transparent 128×128 native SVGs, about 6.7 KB combined. They contain no embedded raster images, external resources or typeset project names.

| Mark | Source |
| --- | --- |
| ICM Buddy | Aperture geometry derived from the owner’s [original FYP logo](https://raw.githubusercontent.com/SeaBoiii/FYP/main/.images/logo.png), preserving its purple identity. |
| Classility, Novels Library, Potionality, Age of War, Nizam, Tetris | Mark-only adaptations of the owner’s existing `images/hub/*-logo.svg` artwork: shield, book, flask, blades, crescent/pavilion and blocks. Backgrounds and banner wordmarks removed. |
| silicon·self | Geometry adapted from the owner’s [public project favicon](https://raw.githubusercontent.com/SeaBoiii/amd_personality/main/public/favicon.svg). |
| Train a Tiny AI, AI Rover Challenge, AMD Chip Challenge, Crosswinds in Sapa | New original vector compositions: converging example nodes, sensor rover, modular chip and mountain/wind paths. |

The independent project marks do not use AMD’s corporate logo. The actual employer identity remains in the career section. New logos were checked as XML and rendered together on a dark contact sheet; asset requests passed.
