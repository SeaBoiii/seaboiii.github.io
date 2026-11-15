/** Focused runtime regression checks for the optional, demand-rendered archive. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(repo, 'showcase/package.json'));
const { chromium } = require('playwright');
const base = (process.env.SITE_URL || 'http://127.0.0.1:4327').replace(/\/$/, '');
const output = resolve(repo, 'web/qa/artifacts');
await mkdir(output, { recursive: true });
const report = { base, checks: [], failures: [], pageErrors: [], consoleErrors: [], screenshots: [], observations: [] };
const browser = await chromium.launch({ headless: true });
const contexts = [];
function check(pass, label, details) {
  const item = { pass: Boolean(pass), label, ...(details === undefined ? {} : { details }) };
  report.checks.push(item);
  if (!pass) report.failures.push(item);
}
async function run(label, action) {
  console.log('Checking: ' + label);
  try { await action(); } catch (error) { check(false, label, error.stack || error.message); }
}
async function surface(options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  contexts.push(context);
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push({ message: error.message, url: page.url() }));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ message: message.text(), url: page.url() }); });
  await page.goto(base + '/novel/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  return page;
}
const host = '.library-archive-canvas';
async function ready(page) {
  await page.waitForSelector('.library-hero[data-archive-ready="true"]', { timeout: 30000 });
  await page.waitForFunction(() => Number(document.querySelector('.library-archive-canvas')?.dataset.archiveFrames) > 0);
}
async function frames(page) {
  return page.locator(host).evaluate(element => Number(element.dataset.archiveFrames || 0));
}
async function settle(page, maximum = 8000) {
  const started = Date.now();
  let previous = await frames(page);
  let stable = 0;
  while (Date.now() - started < maximum) {
    await page.waitForTimeout(150);
    const current = await frames(page);
    if (current === previous) stable++; else stable = 0;
    if (stable >= 3) return current;
    previous = current;
  }
  throw new Error('Archive did not become idle within ' + maximum + 'ms.');
}
async function screen(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(image => { const r = image.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).map(image => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled' });
  report.screenshots.push(name + '.png');
}
async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  check(size.document <= size.viewport + 1, label + ' fits viewport', size);
}
async function fallback(page, label) {
  await page.waitForTimeout(850);
  check(await page.locator('.library-hero-book').count() === 3, label + ' keeps three real cover links');
  check(await page.locator('.library-catalogue-book').count() === 50, label + ' keeps the entire catalogue');
  check(await page.locator(host + ' canvas').count() === 0, label + ' avoids WebGL allocation');
  const source = await page.locator('.library-hero').evaluate(element => ({ ready: element.dataset.archiveReady, motion: element.dataset.archiveMotion, pinned: element.dataset.archivePinned, progress: getComputedStyle(element).getPropertyValue('--archive-progress').trim() }));
  check(source.ready !== 'true' && source.pinned !== 'true', label + ' uses an unpinned static entrance', source);
  await noOverflow(page, label);
}

let page;
await run('Desktop archive, selection and idle rendering', async () => {
  page = await surface();
  await ready(page);
  check(await page.locator(host).getAttribute('data-archive-books') === '24', 'Desktop archive uses 24 real books');
  check(await page.locator('.library-hero-book').count() === 3, 'Desktop keeps three accessible featured links');
  check(await page.locator('.library-catalogue-book').count() === 50, 'All 50 catalogue books remain');
  const resting = await settle(page);
  await page.waitForTimeout(400);
  check(await frames(page) === resting, 'Idle archive schedules no continuing draws', { resting, final: await frames(page) });
  await page.locator('.library-hero-book-1').focus();
  await page.waitForTimeout(200);
  check(await page.locator('.library-hero-book-1').getAttribute('data-selected') === 'true', 'Keyboard focus selects its matching 3D book');
  check(await frames(page) > resting, 'Selection redraws the 3D archive');
  await settle(page);
  await noOverflow(page, 'Desktop archive');
  await screen(page, 'archive-motion-desktop');
});

await run('Pause and resume partway through the scroll chapter', async () => {
  if (!page) throw new Error('Desktop page was unavailable.');
  const placement = await page.locator('.library-hero').evaluate(element => { const r = element.getBoundingClientRect(); return { top: scrollY + r.top, travel: element.offsetHeight - innerHeight }; });
  check(placement.travel > 300, 'Desktop receives a substantial scroll chapter', placement);
  await page.evaluate(({ top, travel }) => scrollTo(0, top + travel * .45), placement);
  await settle(page);
  const before = await page.locator('.library-hero').evaluate(element => ({ progress: Number(getComputedStyle(element).getPropertyValue('--archive-progress')), scrollY, pinned: element.dataset.archivePinned }));
  check(before.progress > .25 && before.progress < .75, 'Scrolling reaches the middle of the archive', before);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.waitForTimeout(250);
  const paused = await frames(page);
  await page.mouse.move(300, 250);
  await page.waitForTimeout(400);
  check(await frames(page) === paused, 'Paused archive freezes its rendered pose', { paused, final: await frames(page) });
  check(await page.evaluate(() => localStorage.getItem('fieldbook-motion')) === 'off', 'Pause shares the portfolio motion preference');
  await screen(page, 'archive-motion-paused');
  await page.getByRole('button', { name: 'Motion paused', exact: true }).click();
  await settle(page);
  const resumed = await page.locator('.library-hero').evaluate(element => ({ progress: Number(getComputedStyle(element).getPropertyValue('--archive-progress')), scrollY, pinned: element.dataset.archivePinned }));
  check(Math.abs(resumed.progress - before.progress) < .06, 'Resume restores the same scroll chapter position', { before, resumed });
  check(await page.locator(host + ' canvas').count() === 1, 'Motion toggles reuse one canvas');
});

await run('Resize to a phone while the motion is paused', async () => {
  if (!page) throw new Error('Desktop page was unavailable.');
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(500);
  await noOverflow(page, 'Paused phone archive');
  check(await page.locator('.library-hero').getAttribute('data-archive-pinned') === 'false', 'Phone resize releases desktop pinning');
  check(await page.locator('.library-hero-book').count() === 3, 'Phone resize keeps the featured novel links');
  await screen(page, 'archive-motion-paused-phone');
  const paused = await frames(page);
  await page.waitForTimeout(350);
  check(await frames(page) === paused, 'Paused resized archive stays idle');
  await page.getByRole('button', { name: 'Motion paused', exact: true }).click();
  await settle(page);
  await screen(page, 'archive-motion-resumed-phone');
});

await run('Offscreen and hidden-document drawing suspension', async () => {
  if (!page) throw new Error('Desktop page was unavailable.');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(250);
  const offscreen = await frames(page);
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.waitForTimeout(500);
  check(await frames(page) === offscreen, 'Offscreen resize causes no additional rendered frames', { before: offscreen, after: await frames(page) });
  await page.evaluate(() => scrollTo(0, 0));
  await settle(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hidden = await frames(page);
  await page.mouse.move(250, 500);
  await page.evaluate(() => dispatchEvent(new Event('resize')));
  await page.waitForTimeout(500);
  check(await frames(page) === hidden, 'Hidden-document event suspends all archive draws', { before: hidden, after: await frames(page) });
  report.observations.push('Document hiding is exercised through a synthetic document.hidden getter plus the actual visibilitychange handler.');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await settle(page);
  check(await frames(page) > hidden, 'Document visibility restoration redraws the archive');
});

await run('OS reduced-motion fallback', async () => {
  const reduced = await surface({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  await fallback(reduced, 'Reduced motion');
  await screen(reduced, 'archive-motion-reduced');
});

await run('Save-data fallback', async () => {
  const data = await surface({}, () => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
  await fallback(data, 'Save-data');
});

await run('Unavailable WebGL fallback', async () => {
  const unavailable = await surface({}, () => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return /^webgl/.test(type) ? null : original.call(this, type, ...args); };
  });
  await fallback(unavailable, 'Unavailable WebGL');
  await screen(unavailable, 'archive-motion-no-webgl');
});

await run('Disabled JavaScript fallback', async () => {
  const staticPage = await surface({ javaScriptEnabled: false, viewport: { width: 320, height: 740 } });
  check(await staticPage.locator('.library-hero-book').count() === 3, 'No-JavaScript includes all three real featured links');
  check(await staticPage.locator('.library-catalogue-book').count() === 50, 'No-JavaScript includes all 50 novels');
  check(await staticPage.locator(host + ' canvas').count() === 0, 'No-JavaScript uses no rendering canvas');
  await noOverflow(staticPage, 'No-JavaScript at 320px');
  await screen(staticPage, 'archive-motion-no-js-320');
});

await run('A saved portfolio motion choice controls a fresh library visit', async () => {
  const shared = await surface({}, () => localStorage.setItem('fieldbook-motion', 'off'));
  await fallback(shared, 'Saved motion preference');
  await shared.evaluate(() => { localStorage.setItem('fieldbook-motion', 'on'); dispatchEvent(new Event('portfolio:motion')); });
  await ready(shared);
  check(await shared.locator(host + ' canvas').count() === 1, 'Portfolio motion event activates the library scene');
});

check(report.pageErrors.length === 0, 'No browser JavaScript exceptions', report.pageErrors);
await writeFile(resolve(output, 'archive-motion-report.json'), JSON.stringify(report, null, 2) + '\n');
for (const context of contexts) await context.close();
await browser.close();
console.log(JSON.stringify({ checks: report.checks.length, failures: report.failures, pageErrors: report.pageErrors, consoleErrors: report.consoleErrors, screenshots: report.screenshots }, null, 2));
if (report.failures.length) process.exitCode = 1;
