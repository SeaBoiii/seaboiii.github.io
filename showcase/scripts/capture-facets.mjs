/** Review images of the real production pages, without browser chrome. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'docs/screenshots/aleem-facets');
const base = process.env.SITE_URL || 'http://127.0.0.1:4176';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const images = [];
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(15000);
page.on('pageerror', error => errors.push(error.message));
async function snapshot(target, name) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => {
      const r = image.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    }).map(image => image.decode().catch(() => {})));
    await new Promise(requestAnimationFrame);
  });
  await target.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled' });
  images.push({ name: name + '.png', viewport: target.viewportSize(), url: target.url().replace(base, '') });
}
async function archiveSettled(target) {
  await target.waitForSelector('[data-archive-state="ready"]');
  let last = -1;
  for (let attempt = 0, stable = 0; attempt < 80; attempt++) {
    const next = await target.locator('.library-archive-canvas').getAttribute('data-archive-frames');
    stable = next === last ? stable + 1 : 0;
    if (stable >= 3) return;
    last = next;
    await target.waitForTimeout(150);
  }
  throw new Error('Archive did not settle for its review image');
}
try {
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__workbenchCapture?.asset === 'higgsfield');
  for (const [name, progress] of [['portfolio-desktop', 0], ['portfolio-precision', .49], ['portfolio-worlds', .93]]) {
    await page.evaluate(progress => window.__workbenchCapture.setProgressAsync(progress), progress);
    await snapshot(page, name);
  }
  await page.goto(base + '/novel/', { waitUntil: 'networkidle' });
  await archiveSettled(page);
  await snapshot(page, 'library-desktop');
  await page.evaluate(() => {
    const collection = document.querySelector('#collection');
    scrollTo({ top: collection.getBoundingClientRect().top + scrollY - document.querySelector('header').getBoundingClientRect().height - 12, behavior: 'instant' });
  });
  await snapshot(page, 'library-catalogue');
  for (const [slug, name] of [['icm-buddy', 'independent-work'], ['novels-library', 'project-library']]) {
    console.log('Capturing ' + name);
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-experience-ready="true"]', { state: 'attached' });
    await page.evaluate(async slug => {
      await document.fonts.ready;
      const chapter = document.querySelector('[data-scroll-chapter="projects"]');
      const pin = chapter.querySelector('.chapter-pin');
      const stage = chapter.querySelector('[data-project-stage="' + slug + '"]');
      const track = chapter.querySelector('.project-track');
      const viewport = chapter.querySelector('.project-viewport');
      const top = chapter.getBoundingClientRect().top + scrollY - document.querySelector('.site-header').getBoundingClientRect().height;
      const progress = stage.offsetLeft / Math.max(1, track.scrollWidth - viewport.clientWidth);
      scrollTo({ top: top + progress * (chapter.offsetHeight - pin.offsetHeight), behavior: 'instant' });
    }, slug);
    await page.waitForFunction(slug => {
      const stage = document.querySelector('[data-project-stage="' + slug + '"]');
      const pin = document.querySelector('.projects-pin');
      const header = document.querySelector('.site-header');
      return stage.dataset.active === 'true' && Math.abs(stage.getBoundingClientRect().left) < 2 && Math.abs(pin.getBoundingClientRect().top - header.getBoundingClientRect().height) < 2;
    }, slug, { timeout: 15000 });
    await snapshot(page, name);
  }
  await page.goto(base + '/#project/icm-buddy', { waitUntil: 'networkidle' });
  await page.waitForSelector('dialog[open]');
  await snapshot(page, 'project-popout');
  const phoneContext = await browser.newContext({ viewport: { width: 390, height: 1000 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const phone = await phoneContext.newPage();
  phone.on('pageerror', error => errors.push(error.message));
  await phone.goto(base + '/', { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => window.__workbenchCapture?.asset === 'higgsfield');
  await snapshot(phone, 'portfolio-mobile');
  await phone.goto(base + '/novel/', { waitUntil: 'networkidle' });
  await archiveSettled(phone);
  await snapshot(phone, 'library-mobile');
  await phone.setViewportSize({ width: 390, height: 1200 });
  await phone.goto(base + '/#stage-novels-library', { waitUntil: 'networkidle' });
  await phone.locator('[data-project-stage="novels-library"]').evaluate(stage => scrollTo({ top: stage.getBoundingClientRect().top + scrollY - document.querySelector('.site-header').getBoundingClientRect().height, behavior: 'instant' }));
  await snapshot(phone, 'project-library-mobile');
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ base, source: 'Actual combined production build', images, pageErrors: errors }, null, 2) + '\n');
  console.log(`Captured ${images.length} production screenshots with no page errors.`);
} finally { await browser.close(); }
