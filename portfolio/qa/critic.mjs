import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const pass = process.argv[2] ?? "critic";
const out = new URL(`./artifacts/${pass}/`, import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const findings = [];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
if (pass === "critic-second")
  viewports.push(
    { name: "mobile-360", width: 360, height: 800 },
    { name: "tablet", width: 1024, height: 768 },
  );
for (const viewport of viewports) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 760,
    hasTouch: viewport.width < 760,
  });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  for (const id of [
    "hero",
    "statement",
    "journey",
    "work",
    "project-tiny-ai",
    "project-rover",
    "project-icm-buddy",
    "project-classility",
    "perspective",
    "playground",
    "about",
    "contact",
  ]) {
    const rect = await page
      .locator(`#${id}`)
      .evaluate((el) => ({
        top: el.getBoundingClientRect().top + scrollY,
        height: el.getBoundingClientRect().height,
      }));
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      Math.max(0, rect.top - 85),
    );
    await page.waitForTimeout(600);
    await page.screenshot({
      path: new URL(`${viewport.name}-${id}.png`, out).pathname.replace(
        /^\/([A-Za-z]:)/,
        "$1",
      ),
    });
    findings.push({ viewport, id, ...rect });
  }
  await page.screenshot({
    path: new URL(`${viewport.name}-full.png`, out).pathname.replace(
      /^\/([A-Za-z]:)/,
      "$1",
    ),
    fullPage: true,
  });
  await page.close();
}
await writeFile(
  new URL("captures.json", out),
  JSON.stringify(findings, null, 2),
);
await browser.close();
console.log("Critic screenshots captured.");
