import { chromium } from "playwright";
const out = new URL("./artifacts/critic/", import.meta.url);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
for (const id of [
  "project-tiny-ai",
  "project-rover",
  "project-icm-buddy",
  "project-classility",
  "playground",
  "journey",
]) {
  await page
    .locator(`#${id}`)
    .screenshot({
      path: new URL(`mobile-${id}-entire.png`, out).pathname.replace(
        /^\/([A-Za-z]:)/,
        "$1",
      ),
    });
}
await browser.close();
console.log("Full mobile section captures complete.");
