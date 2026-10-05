import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173";
const pass = process.argv[3] ?? "revision";
const output = fileURLToPath(new URL(`./artifacts/${pass}/`, import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];

async function run(name, viewport) {
  const checks = [];
  const errors = [];
  const check = (label, passed, evidence) => checks.push({ name: label, passed, evidence });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: output, size: viewport } });
  // Deliberately exercise the real renderer on a deterministic software GPU.
  // This is functional coverage, not a physical-device performance benchmark.
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, attributes) {
      return original.call(this, type, /webgl/i.test(type) ? { ...attributes, failIfMajorPerformanceCaveat: false } : attributes);
    };
    window.__revisionDraws = 0;
    for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Type) continue;
      for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        const draw = Type.prototype[method];
        if (draw) Type.prototype[method] = function(...args) { window.__revisionDraws++; return draw.apply(this, args); };
      }
    }
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  const audioRequests = [];
  page.on("request", request => { if (/\.(mp3|wav|ogg)(?:\?|$)/i.test(request.url())) audioRequests.push(request.url()); });
  async function screenshot(label) {
    const filename = `${name}-${label}.png`;
    await page.screenshot({ path: path.join(output, filename), animations: "disabled" });
    return filename;
  }
  async function moveTo(progress, wait = 650) {
    await page.evaluate(p => {
      const story = document.querySelector("#core");
      const sticky = story.querySelector(".core-sticky");
      const inset = parseFloat(getComputedStyle(sticky).top) || 0;
      window.scrollTo({ top: story.getBoundingClientRect().top + scrollY - inset + (story.offsetHeight - sticky.offsetHeight) * p, behavior: "instant" });
    }, progress);
    await page.waitForTimeout(wait);
    return page.evaluate(() => {
      const rect = document.querySelector(".core-stage").getBoundingClientRect();
      return { top: rect.top, left: rect.left, width: rect.width, height: rect.height, progress: Number(document.querySelector(".core-stage").dataset.coreProgress), diagnostics: window.__computeDiagnostics ? structuredClone(window.__computeDiagnostics) : null };
    });
  }
  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    check("no initial audio download", audioRequests.length === 0, [...audioRequests]);
    const initialAudio = await page.locator("audio").evaluateAll(elements => elements.map(element => ({ src: element.getAttribute("src"), autoplay: element.autoplay, preload: element.preload, paused: element.paused })));
    check("music starts off without a source", initialAudio.length === 1 && initialAudio.every(audio => !audio.src && !audio.autoplay && audio.preload === "none" && audio.paused), initialAudio);
    await moveTo(0.05);
    await page.waitForFunction(() => !!window.__computeDiagnostics, null, { timeout: 15000 });
    check("interactive renderer active", await page.locator(".core-stage canvas").count() === 1);
    const stages = [];
    for (const p of [0.05, 0.25, 0.5, 0.72, 0.93]) {
      stages.push(await moveTo(p));
      await screenshot(`core-${Math.round(p * 100)}`);
    }
    check("lid separates before frame and die", stages[1].diagnostics.layers.lid > stages[0].diagnostics.layers.lid && stages[1].diagnostics.layers.frame === stages[0].diagnostics.layers.frame, stages);
    check("layer expansion is ordered", stages.every((stage, i) => i === 0 || stage.diagnostics.layers.lid >= stages[i - 1].diagnostics.layers.lid && stage.diagnostics.layers.die >= stages[i - 1].diagnostics.layers.die), stages);
    const held = await moveTo(0.98);
    check("fully expanded pose holds before exit", Math.abs(held.diagnostics.layers.lid - stages.at(-1).diagnostics.layers.lid) < 0.005, held);
    const reversed = await moveTo(0.5);
    check("reverse scroll restores intermediate pose", ["lid", "die", "frame", "connections"].every(key => Math.abs(reversed.diagnostics.layers[key] - stages[2].diagnostics.layers[key]) < 0.008), { forward: stages[2], reversed });
    const continuous = [];
    for (const reverse of [false, true]) {
      await moveTo(reverse ? 0.92 : 0.08);
      const samples = await page.evaluate(reverseDirection => new Promise(resolve => {
        const story = document.querySelector("#core");
        const sticky = story.querySelector(".core-sticky");
        const stage = document.querySelector(".core-stage");
        const startY = story.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(sticky).top) || 0);
        const travel = story.offsetHeight - sticky.offsetHeight;
        const start = performance.now();
        const samples = [];
        function frame(time) {
          const fraction = Math.min(1, (time - start) / 3000);
          const progress = reverseDirection ? 0.92 - fraction * 0.84 : 0.08 + fraction * 0.84;
          window.scrollTo({ top: startY + travel * progress, behavior: "instant" });
          const rect = stage.getBoundingClientRect();
          samples.push({ time, scroll: scrollY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, progress: Number(stage.dataset.coreProgress), layers: window.__computeDiagnostics ? { ...window.__computeDiagnostics.layers } : null });
          if (fraction < 1) requestAnimationFrame(frame);
          else resolve(samples);
        }
        requestAnimationFrame(frame);
      }), reverse);
      const top = samples.map(sample => sample.top);
      const left = samples.map(sample => sample.left);
      check(`continuous ${reverse ? "reverse" : "forward"} scroll keeps canvas anchored`, Math.max(...top) - Math.min(...top) < 2 && Math.max(...left) - Math.min(...left) < 2, { count: samples.length, topRange: Math.max(...top) - Math.min(...top), leftRange: Math.max(...left) - Math.min(...left) });
      check(`continuous ${reverse ? "reverse" : "forward"} progress is monotonic`, samples.every((sample, index) => index === 0 || (reverse ? sample.progress <= samples[index - 1].progress + 0.001 : sample.progress >= samples[index - 1].progress - 0.001)));
      continuous.push({ reverse, samples });
    }
    await writeFile(path.join(output, `${name}-scroll-samples.json`), JSON.stringify(continuous, null, 2));
    for (const p of [0.9, 0.1, 0.85, 0.2, 0.6]) await moveTo(p, 40);
    const rapid = await moveTo(0.6);
    check("rapid scrolling settles at current progress", Math.abs(rapid.diagnostics.progress - 0.6) < 0.005 && rapid.diagnostics.rendering === "resting", rapid);
    const beforePointer = await page.evaluate(() => window.__revisionDraws);
    await page.mouse.move(30, 30);
    await page.mouse.move(viewport.width - 20, viewport.height - 20);
    await page.waitForTimeout(400);
    const afterPointer = await page.evaluate(() => window.__revisionDraws);
    check("pointer movement does not redraw or move the core", beforePointer === afterPointer, { beforePointer, afterPointer });
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const beforeOffscreen = await page.evaluate(() => window.__revisionDraws);
    await page.waitForTimeout(400);
    const afterOffscreen = await page.evaluate(() => window.__revisionDraws);
    check("offscreen scene rests", beforeOffscreen === afterOffscreen && await page.locator(".core-stage").getAttribute("data-visible") === "false", { beforeOffscreen, afterOffscreen });
    await page.locator('.nav-links a[href="#work"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    check("keyboard navigation reaches work hash", new URL(page.url()).hash === "#work");
    await page.goto(new URL("#core", baseUrl).href, { waitUntil: "networkidle" });
    await page.waitForTimeout(650);
    check("direct core hash retains a local scene", await page.locator("#core").evaluate(element => element.getBoundingClientRect().top < innerHeight));
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await page.locator("#core").scrollIntoViewIfNeeded();
    const landscape = await page.locator(".core-sticky").evaluate(element => ({ position: getComputedStyle(element).position, height: element.getBoundingClientRect().height, page: document.documentElement.scrollWidth, viewport: innerWidth }));
    check("short landscape uses normal flow without overflow", landscape.position !== "sticky" && landscape.page <= landscape.viewport + 1, landscape);
    await screenshot("short-landscape");
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(400);
    await page.locator("#core").scrollIntoViewIfNeeded();
    const shortPortrait = await page.locator(".core-sticky").evaluate(element => ({
      position: getComputedStyle(element).position,
      page: document.documentElement.scrollWidth,
      viewport: innerWidth,
      narrativeHeight: element.querySelector(".core-narrative").getBoundingClientRect().height,
      overflow: getComputedStyle(element).overflowY,
    }));
    check("short portrait keeps the narrative in normal scroll flow", shortPortrait.position !== "sticky" && shortPortrait.page <= shortPortrait.viewport + 1 && shortPortrait.overflow !== "hidden", shortPortrait);
    await screenshot("short-portrait");
    await page.setViewportSize({ width: 320, height: 900 });
    await page.waitForTimeout(400);
    const reflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
    check("320 CSS-pixel reflow avoids horizontal overflow", reflow.page <= reflow.viewport + 1, reflow);
    await screenshot("reflow-320");
    await page.setViewportSize(viewport);
    await moveTo(0.5);
    const afterResize = await moveTo(0.5);
    check("resize restores consistent progress", Math.abs(afterResize.diagnostics.progress - 0.5) < 0.005, afterResize);
    const button = page.locator(".soundtrack-toggle");
    check("optional music control exists", await button.count() === 1);
    if (await button.count()) {
      const box = await button.boundingBox();
      const header = await page.locator(".site-header").evaluate(element => {
        const items = Array.from(element.querySelectorAll("a,button")).map(item => ({ label: item.getAttribute("aria-label") || item.textContent.trim(), left: item.getBoundingClientRect().left, right: item.getBoundingClientRect().right, top: item.getBoundingClientRect().top, bottom: item.getBoundingClientRect().bottom }));
        return { items, width: innerWidth };
      });
      check("header controls fit without overlaps", header.items.every((item, i) => item.left >= 0 && item.right <= header.width && header.items.every((other, j) => i === j || item.right <= other.left + 0.5 || item.left >= other.right - 0.5 || item.bottom <= other.top || item.top >= other.bottom)), header);
      check("sound control has a 44px target", box.width >= 44 && box.height >= 44, box);
      await button.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector(".soundtrack-toggle").getAttribute("aria-pressed") === "true", null, { timeout: 15000 });
      const playing = await page.locator("audio").evaluate(audio => ({ paused: audio.paused, volume: audio.volume, duration: audio.duration, loop: audio.loop, currentTime: audio.currentTime }));
      check("explicit keyboard action starts real looping audio", !playing.paused && playing.loop && playing.volume === 0.25 && playing.duration > 50 && playing.duration < 65 && audioRequests.length > 0, playing);
      await button.click();
      check("pause updates real audio and accessible state", await page.locator("audio").evaluate(audio => audio.paused) && await button.getAttribute("aria-pressed") === "false");
      await button.click();
      await page.waitForFunction(() => !document.querySelector("audio").paused);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForTimeout(150);
      check("hidden-page event pauses playback", await page.locator("audio").evaluate(audio => audio.paused) && await button.getAttribute("aria-pressed") === "false");
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
      await page.waitForTimeout(150);
      check("visibility restore does not restart music", await page.locator("audio").evaluate(audio => audio.paused));
      await page.reload({ waitUntil: "networkidle" });
      check("reload resets music to off", await page.locator(".soundtrack-toggle").getAttribute("aria-pressed") === "false" && await page.locator("audio").getAttribute("src") === null);
      await page.route("**/*.mp3", route => route.abort("failed"));
      await page.locator(".soundtrack-toggle").click();
      await page.waitForFunction(() => /could not start/i.test(document.querySelector("#soundtrack-status").textContent));
      check("failed audio gives accessible retry feedback", await page.locator(".soundtrack-toggle").getAttribute("aria-pressed") === "false" && await page.locator("#soundtrack-status").getAttribute("role") === "status");
      await page.unroute("**/*.mp3");
    }
    await moveTo(0.5);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    check("interactive scene and audio have no axe AA violations", axe.violations.length === 0, axe.violations);
    await page.locator(".core-stage canvas").evaluate(canvas => canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
    await page.waitForTimeout(500);
    const lost = await page.locator("#core").evaluate(story => ({ rendering: story.dataset.rendering, fallbackOpacity: getComputedStyle(story.querySelector(".core-fallback")).opacity, canvases: story.querySelectorAll("canvas").length, top: story.getBoundingClientRect().top, headerBottom: document.querySelector("header").getBoundingClientRect().bottom }));
    check("context loss restores the authored static diagram", lost.rendering === "static" && Number(lost.fallbackOpacity) === 1 && lost.canvases === 0, lost);
    check("context loss keeps the restored story at the reading position", Math.abs(lost.top - lost.headerBottom) <= 2, lost);
    await screenshot("context-loss-fallback");
    await page.reload({ waitUntil: "networkidle" });
    await moveTo(0.5);
    await page.waitForFunction(() => !!window.__computeDiagnostics, null, { timeout: 15000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(400);
    check("enabling reduced motion removes the active renderer", await page.locator(".core-stage canvas").count() === 0 && await page.locator("#core").getAttribute("data-rendering") === "static");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(400);
    check("clearing reduced motion keeps this visit static", await page.locator(".core-stage canvas").count() === 0);
    check("no uncaught browser errors", errors.length === 0, errors);
  } catch (error) {
    check("scenario completes", false, error.stack);
    await screenshot("failure").catch(() => {});
  }
  await context.close();
  const recordedVideo = await page.video()?.path();
  const video = recordedVideo ? path.join(output, `${name}.webm`) : null;
  if (recordedVideo) await rename(recordedVideo, video);
  const result = { name, passed: checks.every(check => check.passed), checks, errors, video, conditions: "Headless Chromium with forced SwiftShader software rendering. Visibility event is simulated. 320px reflow is a CSS viewport check, not browser zoom." };
  results.push(result);
  await writeFile(path.join(output, `${name}.json`), JSON.stringify(result, null, 2));
  console.log(`${name}: ${result.passed ? "PASS" : "FAIL"}; ${checks.filter(check => !check.passed).map(check => check.name).join(", ")}`);
}
try {
  await run("desktop-continuity", { width: 1440, height: 1000 });
  await run("mobile-continuity", { width: 390, height: 844 });
} finally {
  await browser.close();
  await writeFile(path.join(output, "revision-summary.json"), JSON.stringify({ baseUrl, results }, null, 2));
}
if (results.some(result => !result.passed)) process.exitCode = 1;
console.log(`Revision artifacts: ${output}`);
