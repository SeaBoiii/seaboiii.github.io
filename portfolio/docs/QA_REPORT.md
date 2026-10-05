# Portfolio revision QA report

Reviewed 5 October 2026 on `redesign/compute-core`. The root portfolio is rebuilt and assembled locally; nothing has been pushed, merged or deployed. Review preview: http://127.0.0.1:4176/ (assembled output). Production browser tests used the identical portfolio build on port 4175; final soundtrack checks also ran against the assembled preview.

## Results

| Verification | Result |
| --- | --- |
| TypeScript and production build/prerender | Passed |
| Full browser audit | 18/18 scenarios passed |
| Final affected-layout audit | 4/4 scenarios passed |
| Continuous core, input, media and recovery audit | 68/68 checks passed |
| Final image sizing, recovery position and focus checks | 39/39 checks passed |
| Production soundtrack lifecycle | 14/14 checks passed; isolated unmount also passed in development |
| Automated WCAG 2.1 AA checks | Zero violations in tested states |
| Browser errors and horizontal overflow | None in tested states |
| 21st deterministic source review | Zero errors/warnings; 173 informational colour suggestions |
| Deployment preservation | 50 novels, 820 chapter/epilogue routes, 2609 preserved files verified |

The complete audit covered 1440x1000 desktop, 1024x768 tablet, and phones at 360x800, 390x844, 393x873, 412x915 and 430x932. Additional tests covered 320px CSS reflow, 360x640/320x568 short phones and 844x390 landscape. Reduced motion, explicit static quality, unavailable WebGL, Save-Data and disabled JavaScript retain complete semantic content and a readable diagram. Eligible interactive scenes were exercised with actual WebGL through Chromium SwiftShader.

## Motion and interaction evidence

Recorded continuous forward and reverse scrolling, with per-frame scene bounds and layer samples. Canvas position remains fixed within its local sticky panel; progress is monotonic, intermediate poses reverse consistently, rapid scrolling settles without overshoot, and the expanded view holds before leaving. Pointer movement does not move or redraw the core. Offscreen scenes stop drawing. Short layouts use normal document flow rather than trapping content.

Keyboard checks cover navigation, the skip link, project disclosure, playground filters, ICM visual switching and music. Runtime reduced-motion changes remove the renderer and retain static content; returning the preference does not restart animation automatically. Actual `WEBGL_lose_context` tests show the static fallback. Recovery retains the visible core below the header and does not pull a reader away from the hero, About or Contact.

Final inspection corrected AMD-label contrast, short-phone sticky overflow, joined heading words, excess height around the generated About image, recovery reading position and the sound button's focused playing state. Tetris now uses its verified absolute live URL, so the independently hosted project also opens from the local preview.

## Audio and generated media

One ElevenLabs `music_v2_5` instrumental was generated and committed with its prompt/model/hash metadata. The MP3 is 960,429 bytes, decoded to 60.024 seconds of stereo audio at 48 kHz. Peak amplitude was 0.896 with no decoded clipping. The actual loop wrap and waveform boundary were checked. This environment has not subjectively listened to the track; waveform continuity does not establish perceptual seamlessness.

Tests establish no initial audio request, deliberate activation, actual playing state, volume 0.25, looping, pause, explicit resume, page-exit suspension, simulated visibility suspension, cancellation of a pending request, network failure/retry and silent reload. Audio is independent of graphics and absent from the initial transfer. JavaScript-disabled pages hide the inert sound button.

The generated About image is a tracked 1254px transparent PNG, reproduced as a 1200px WebP of 206,344 bytes. Its displayed dimensions remain square at desktop and phone sizes. Builds copy finished assets and never access generation APIs or credentials.

## Performance and limits

The full local audit observed initial-view LCP from 112 to 688 ms and CLS from 0 to 0.0318. These are localhost Chromium observations, not field performance claims. Phone profiles include a CPU slowdown and a simulated mobile network profile. Graphics recording uses software rendering; physical-device GPU, battery, thermal behaviour and Safari/iOS playback have not been measured.

The build retains Vite's large-chunk warning for the lazily loaded Three.js bundle (about 925 kB minified / 246 kB gzip). Static, reduced-motion, Save-Data and no-GPU paths were checked for absence of that engine request. Rendering comes to rest and scene materials/geometry are reused. No claim of physical-device 60fps or field INP is made.

Automated axe and keyboard checks do not replace a manual assistive-technology review. 320px CSS reflow was tested; browser zoom was not separately driven. Visibility interruption was simulated and verified against the actual media element. The novel reader build was preserved, not modified; assembly rechecked its routes and original file contents. Separate GitHub Pages project builds are verified on their live URLs and are not bundled in this repository.

## Reproduce and inspect

From `portfolio/`, with an assembled preview running:

```sh
npm run check
npm run build
npm run assemble
npm run qa -- http://127.0.0.1:4176 revision-final
npm run qa:revision -- http://127.0.0.1:4176 revision-final
npm run qa:soundtrack -- http://127.0.0.1:4176
```

Artifacts are deliberately ignored by git; source audits and this report are committed:

- `qa/artifacts/revision-final/summary.json`: full 18-scenario summary and section screenshots.
- `qa/artifacts/revision-final/revision-summary.json`: continuous interaction checks and frame samples.
- `qa/artifacts/revision-final/desktop-continuity.webm` and `mobile-continuity.webm`: recorded interactions.
- `qa/artifacts/revision-targeted/summary.json`: four affected-layout reruns.
- `qa/artifacts/revision-polish/summary.json` and `guards-focus.json`: final 39 image/recovery/focus checks and screenshots.
- `qa/artifacts/revision-final/soundtrack-production.json`: assembled-production audio verification.

The source branch remains the review boundary. Deployment is a separate step.
