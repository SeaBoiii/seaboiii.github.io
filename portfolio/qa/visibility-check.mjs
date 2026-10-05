import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const url = process.argv[2] ?? "http://127.0.0.1:4173";
const output = fileURLToPath(new URL("./artifacts/final/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const profile of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      isMobile: profile.width < 760,
      hasTouch: profile.width < 760,
    });
    await context.addInitScript(() => {
      window.__drawCount = 0;
      for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
        const original = WebGL2RenderingContext.prototype[method];
        if (original) WebGL2RenderingContext.prototype[method] = function (...args) {
          window.__drawCount += 1;
          return original.apply(this, args);
        };
      }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const restBefore = await page.evaluate(() => window.__drawCount);
    await page.waitForTimeout(350);
    const restAfter = await page.evaluate(() => window.__drawCount);

    // The lower playground has no canvas anchor in the viewport on desktop;
    // mobile's scene remains assigned to the already-offscreen hero.
    await page.locator("#playground").evaluate(element => scrollTo({
      top: element.getBoundingClientRect().top + scrollY + 700,
      behavior: "instant",
    }));
    await page.waitForTimeout(500);
    const hiddenStage = await page.locator(".core-stage").getAttribute("data-visible");
    const offBefore = await page.evaluate(() => window.__drawCount);
    await page.waitForTimeout(350);
    const offAfter = await page.evaluate(() => window.__drawCount);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(700);
    const returned = await page.locator(".core-stage").getAttribute("data-visible");

    // Headless Chromium keeps its pages visible when switching tabs. Exercise
    // the application's visibility handler explicitly, without claiming this
    // is a native background-tab or physical battery measurement.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(150);
    const hiddenBefore = await page.evaluate(() => window.__drawCount);
    await page.mouse.move(30, 30);
    await page.waitForTimeout(350);
    const hiddenAfter = await page.evaluate(() => window.__drawCount);
    await page.evaluate(() => {
      delete document.hidden;
      delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(500);
    const visibilityRestored = await page.locator(".core-stage").getAttribute("data-visible");
    const result = {
      profile: profile.name,
      actualWebGLDraws: restBefore,
      restBefore, restAfter, restPaused: restBefore > 0 && restBefore === restAfter,
      hiddenStage, offBefore, offAfter,
      offscreenPaused: hiddenStage === "false" && offBefore === offAfter,
      returned: returned === "true",
      hiddenBefore, hiddenAfter,
      simulatedVisibilityPaused: hiddenBefore === hiddenAfter,
      visibilityRestored: visibilityRestored === "true",
      visibilityMethod: "Simulated document visibility event; native headless tab visibility is unavailable.",
    };
    result.passed = result.restPaused && result.offscreenPaused && result.returned && result.simulatedVisibilityPaused && result.visibilityRestored;
    results.push(result);
    console.log(JSON.stringify(result));
    await context.close();
  }
  const session = await browser.newBrowserCDPSession();
  const info = await session.send("SystemInfo.getInfo");
  const gpu = { devices: info.gpu.devices, renderer: info.gpu.auxAttributes?.glRenderer };
  await writeFile(`${output}visibility-check.json`, JSON.stringify({ results, gpu }, null, 2));
  console.log(JSON.stringify({ gpu }));
  if (results.some(result => !result.passed)) process.exitCode = 1;
} finally {
  await browser.close();
}
