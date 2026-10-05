import { chromium } from "playwright";
const suffix = process.argv[2] === "followup" ? "-followup" : "";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
if (suffix) {
  await page.screenshot({
    path: new URL(`./artifacts/critic-second/mobile-hero${suffix}.png`, import.meta.url)
      .pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  });
  console.log("Hero description:", await page.locator(".hero-description").textContent());
}
const section = page.locator("#project-icm-buddy");
await section.evaluate((el) =>
  scrollTo({
    top: el.getBoundingClientRect().top + scrollY - 85,
    behavior: "instant",
  }),
);
await page.getByRole("button", { name: "Diagram", exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({
  path: new URL(
    `./artifacts/critic-second/mobile-icm-diagram${suffix}.png`,
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
});
console.log("ICM Diagram button works; screenshot saved.");
if (suffix) {
  for (const [label, width, height] of [["mobile", 390, 844], ["mobile-360", 360, 800]]) {
    const phone = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    await phone.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
    await phone.evaluate(() => document.fonts.ready);
    await phone.waitForTimeout(800);
    await phone.screenshot({ path: new URL(`./artifacts/critic-second/${label}-hero-final.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
    const description = await phone.locator(".hero-description").textContent();
    if (!description.includes("experiments and")) throw new Error(`Joined hero words remain at ${width}`);
    await phone.locator("#project-tiny-ai").evaluate(el => scrollTo({top:el.getBoundingClientRect().top+scrollY-85,behavior:"instant"}));
    await phone.waitForTimeout(300);
    await phone.screenshot({ path: new URL(`./artifacts/critic-second/${label}-ai-final.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
    console.log(`Final ${width}px hero spacing and AI figure captured.`);
    await phone.close();
  }
}
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
});
await desktop.goto("http://127.0.0.1:4173/#project-rover", {
  waitUntil: "networkidle",
});
await desktop.evaluate(() => document.fonts.ready);
await desktop.waitForTimeout(1000);
const rect = await desktop
  .locator("#project-rover .project-ownership")
  .boundingBox();
await desktop.screenshot({
  path: new URL(
    `./artifacts/critic-second/desktop-rover-ownership-detail${suffix}.png`,
    import.meta.url,
  ).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
  clip: {
    x: rect.x - 8,
    y: rect.y - 8,
    width: rect.width + 16,
    height: rect.height + 16,
  },
});
await browser.close();
