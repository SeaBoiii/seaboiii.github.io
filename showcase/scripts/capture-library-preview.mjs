/** Refresh the project evidence from the actual current library entrance. */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.SITE_URL || 'http://127.0.0.1:4176';
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../public/showcase-assets/media/novels-archive.webp');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(base + '/novel/', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-archive-state="ready"]');
  await page.evaluate(() => document.fonts.ready);
  let last = '';
  let settled = false;
  for (let attempt = 0, stable = 0; attempt < 80; attempt++) {
    const next = await page.locator('.library-archive-canvas').getAttribute('data-archive-frames');
    stable = next === last ? stable + 1 : 0;
    if (stable >= 3) { settled = true; break; }
    last = next;
    await page.waitForTimeout(150);
  }
  if (!settled) throw new Error('Library scene has not settled for capture');
  const screenshot = await page.screenshot();
  await sharp(screenshot).webp({ quality: 90 }).toFile(output);
  console.log('Updated novels-archive.webp from the current 3D library at ' + base + '/novel/');
} finally {
  await browser.close();
}
