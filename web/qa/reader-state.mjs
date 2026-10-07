/** Regression checks compare the visible paragraph, not just the saved record. */
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(repo, 'showcase/package.json'));
const { chromium } = require('playwright');
const base = (process.env.SITE_URL || 'http://127.0.0.1:4175').replace(/\/$/, '');
const route = '/novel/the-last-stranger/Chapter1/';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let checks = 0;
let failures = 0;

async function test(name, action) {
  try { await action(); checks++; console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + '\n' + error.stack); }
}
async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
}
async function visit(path) {
  const response = await page.goto(base + path, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  await settle();
}
async function position() {
  return page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.prose-reader p, .prose-reader h2, .prose-reader h3, .prose-reader h4, .prose-reader li, .prose-reader hr')];
    let paragraph = blocks.findIndex(block => block.getBoundingClientRect().bottom > 104);
    if (paragraph < 0) paragraph = blocks.length - 1;
    const box = blocks[paragraph].getBoundingClientRect();
    return { paragraph, offset: Math.max(0, Math.min(1, (104 - box.top) / box.height)), y: scrollY };
  });
}
async function place(paragraph, offset = .34) {
  await page.evaluate(({ paragraph, offset }) => {
    const blocks = [...document.querySelectorAll('.prose-reader p, .prose-reader h2, .prose-reader h3, .prose-reader h4, .prose-reader li, .prose-reader hr')];
    const box = blocks[paragraph].getBoundingClientRect();
    scrollTo({ top: scrollY + box.top + box.height * offset - 104, behavior: 'instant' });
  }, { paragraph, offset });
  await page.waitForTimeout(1250);
  return position();
}
async function clickVisibleControl(locator) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= page.viewportSize().height, 'Sticky control is already visible');
  // locator.click() scrollIntoView can reposition an already-visible sticky header.
  // A real coordinate click matches what a reader does with the mouse.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
function samePosition(actual, expected, label) {
  assert.equal(actual.paragraph, expected.paragraph, label + ' paragraph; ' + JSON.stringify({ actual, expected }));
  assert.ok(Math.abs(actual.offset - expected.offset) < .06, label + ' offset; ' + JSON.stringify({ actual, expected }));
}
async function nextByKeyboard() {
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('n');
  await page.waitForURL('**/Chapter2/', { waitUntil: 'networkidle' });
  await settle();
}

try {
  await visit(route);
  let anchor;
  await test('Refresh restores the actual paragraph and fractional position', async () => {
    anchor = await place(18, .42);
    await page.reload({ waitUntil: 'networkidle' });
    await settle();
    samePosition(await position(), anchor, 'Refresh');
  });

  await test('Text size, typeface and width changes preserve the visible paragraph', async () => {
    anchor = await place(22, .37);
    await clickVisibleControl(page.getByRole('button', { name: 'Reading appearance', exact: true }));
    await page.locator('#reader-font-size').press('End');
    await page.locator('#reader-page-width').press('End');
    await page.locator('#reader-font-family').selectOption('merri');
    await page.getByRole('button', { name: 'Close Make yourself comfortable', exact: true }).click();
    await settle();
    samePosition(await position(), anchor, 'Appearance change');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Reading appearance');
  });

  await test('Viewport resizing and phone rotation preserve the visible paragraph', async () => {
    anchor = await place(20, .31);
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 700 }]) {
      await page.setViewportSize(viewport);
      await settle();
      samePosition(await position(), anchor, JSON.stringify(viewport));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
  });

  await test('Back and Forward restore each chapter history entry independently', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settle();
    const first = await place(16, .28);
    await nextByKeyboard();
    assert.ok((await position()).y < 5, 'Fresh next chapter starts at the beginning');
    const second = await place(12, .53);
    await page.goBack({ waitUntil: 'networkidle' });
    await settle();
    samePosition(await position(), first, 'Back to first chapter');
    await page.goForward({ waitUntil: 'networkidle' });
    await settle();
    samePosition(await position(), second, 'Forward to second chapter');
  });

  await test('Returning to the book clears reader theme and Continue explicitly resumes', async () => {
    const before = await place(15, .48);
    await clickVisibleControl(page.locator('.reader-book-link'));
    await page.waitForURL('**/novel/the-last-stranger/', { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-reader')), false);
    const continuation = page.getByRole('link', { name: /^Continue Chapter 2/ });
    assert.ok((await continuation.getAttribute('href')).includes('resume=1'));
    await continuation.click();
    await page.waitForURL('**/Chapter2/?resume=1', { waitUntil: 'networkidle' });
    await settle();
    samePosition(await position(), before, 'Explicit Continue');
  });

  await test('Contents contain focus, suppress reader shortcuts, search, dismiss and restore focus', async () => {
    const url = page.url();
    const before = await place(11, .23);
    const opener = page.getByRole('button', { name: 'Chapter contents', exact: true });
    await clickVisibleControl(opener);
    const search = page.getByRole('searchbox', { name: 'Search chapters', exact: true });
    await search.fill('Chapter 8');
    assert.equal(await page.locator('dialog[open] .reader-contents-list li').count(), 1);
    await page.keyboard.press('n');
    assert.equal(page.url(), url);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement?.closest('dialog[open]')), true);
    }
    assert.equal(await page.evaluate(() => {
      const background = document.querySelector('.reader-book-link');
      background.focus({ preventScroll: true });
      return document.activeElement !== background;
    }), true, 'Native modal makes background controls inert');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Chapter contents');
    samePosition(await position(), before, 'Dialog dismissal');
  });

  await test('Focus mode keeps keyboard-focused toolbar controls visible', async () => {
    await page.getByRole('button', { name: 'Enter focus mode', exact: true }).click();
    await place(20, .3);
    await page.getByRole('button', { name: 'Leave focus mode', exact: true }).focus();
    await page.waitForTimeout(250);
    assert.ok(await page.locator('.reader-toolbar').evaluate(element => element.getBoundingClientRect().top >= 0));
    await page.getByRole('button', { name: 'Leave focus mode', exact: true }).click();
  });

  await test('Completion remains recorded when a chapter is revisited', async () => {
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(1250);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('reading-state:the-last-stranger')).chapters.Chapter2.completed), true);
    await place(3, .2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('reading-state:the-last-stranger')).chapters.Chapter2.completed), true);
  });

  await test('Reader has no JavaScript errors', async () => assert.deepEqual(errors, []));
} finally {
  await browser.close();
}
console.log(`Reader regression checks: ${checks} passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
