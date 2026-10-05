import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
console.log(
  await page
    .locator("header")
    .evaluate((el) => ({
      rect: el.getBoundingClientRect().toJSON(),
      visibility: getComputedStyle(el).visibility,
      opacity: getComputedStyle(el).opacity,
      display: getComputedStyle(el).display,
      scrollY,
    })),
);
await page.screenshot({
  path: new URL(
    "./artifacts/critic/desktop-reduced-fresh.png",
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  animations: "disabled",
});
await browser.close();
