import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const output = resolve(dirname(fileURLToPath(import.meta.url)), 'artifacts');
await mkdir(output, { recursive: true });
const report = { url: base, checks: [], failures: [], pageErrors: [], accessibility: [], measurements: {} };
function check(condition, label, detail) {
  report.checks.push({ label, pass: !!condition, ...(detail === undefined ? {} : { detail }) });
  if (!condition) report.failures.push(label);
}
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', error => report.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__fieldbookVitals = { cls:0, lcp:0 };
    new PerformanceObserver(list => list.getEntries().forEach(entry => { window.__fieldbookVitals.lcp = entry.startTime; })).observe({ type:'largest-contentful-paint',buffered:true });
    new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__fieldbookVitals.cls += entry.value; })).observe({ type:'layout-shift',buffered:true });
  });
  const response = await page.goto(base, { waitUntil:'networkidle' });
  await page.waitForFunction(() => !!document.querySelector('[data-scene-status="ready"]'), null, { timeout:30000 });
  await page.evaluate(() => document.fonts.ready);
  check(response.status() === 200 && (await page.title()).includes('Aleem Siddique'), 'Portfolio is served at root');
  check((await page.locator('h1').textContent()).includes('Engineering'), 'Homepage stays on the portfolio instead of redirecting');
  report.measurements.desktopUnthrottled = await page.evaluate(() => ({ ...window.__fieldbookVitals, transferBytes:performance.getEntriesByType('resource').reduce((sum,entry) => sum + entry.transferSize,0) }));
  await page.screenshot({ path:resolve(output,'desktop-hero.png') });
  await page.getByRole('button',{ name:'Circuit',exact:true }).click();
  check(await page.getByRole('button',{ name:'Circuit',exact:true }).getAttribute('aria-pressed') === 'true', 'Object focus has a keyboard-accessible control');
  await page.keyboard.press('Tab');
  check(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'), 'Keyboard focus is visible');
  await page.keyboard.press('Enter');
  check(await page.getByRole('button',{name:'Book',exact:true}).getAttribute('aria-pressed') === 'true','Workbench focus can be changed with the keyboard');
  await page.locator('#experience').scrollIntoViewIfNeeded();
  await page.screenshot({ path:resolve(output,'desktop-experience.png') });
  const before = await page.locator('#experience').evaluate(element => element.getBoundingClientRect().top);
  // Locator.click() scrolls this sticky header's layout box before dispatch.
  // Use the visible control's coordinates to exercise an actual pointer click.
  const motionControl = await page.locator('[data-motion-toggle]').boundingBox();
  await page.mouse.click(motionControl.x + motionControl.width/2,motionControl.y + motionControl.height/2);
  await page.waitForTimeout(250);
  const after = await page.locator('#experience').evaluate(element => element.getBoundingClientRect().top);
  check(Math.abs(after-before) < 20, 'Motion toggle preserves the viewed section', { before,after });
  check(await page.locator('html').getAttribute('data-motion') === 'off', 'Motion can be paused');
  await page.reload({ waitUntil:'networkidle' });
  check(await page.locator('html').getAttribute('data-motion') === 'off', 'Motion preference persists');
  await page.locator('[data-motion-toggle]').click();
  await page.locator('#work').scrollIntoViewIfNeeded();
  await page.getByRole('button',{ name:'Stories',exact:true }).click();
  check(await page.locator('[data-project-category]:visible').count() === 2, 'Case-study filtering shows the chosen discipline');
  await page.getByRole('button',{ name:'All work',exact:true }).click();
  check(await page.locator('[data-project-category]:visible').count() === 6, 'All six case studies return');
  await page.screenshot({ path:resolve(output,'desktop-work.png') });
  await page.locator('#writing').scrollIntoViewIfNeeded();
  await page.locator('.book-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path:resolve(output,'desktop-writing.png') });
  const homeAssets = await page.locator('img,source').evaluateAll(elements => elements.map(element => element.getAttribute('src')).filter(src => src?.startsWith('/')));
  for (const path of new Set(homeAssets)) check((await context.request.head(base+path)).status() === 200, `Homepage asset resolves: ${path}`);
  await page.locator('.film-section').scrollIntoViewIfNeeded();
  const film = page.locator('.film-section > figure > video');
  await film.evaluate(video => video.play());
  await page.waitForTimeout(300);
  check(await film.evaluate(video => video.currentTime > 0 && !video.paused), 'Authored workbench video plays');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  check(await film.evaluate(video => video.paused), 'Video stops when offscreen');
  await page.goto(base,{waitUntil:'networkidle'});
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  report.accessibility = axe.violations.map(({id,impact,description,nodes}) => ({id,impact,description,elements:nodes.map(node => node.target)}));
  check(!axe.violations.length,'Homepage accessibility audit has no WCAG A/AA violations',report.accessibility);
  const cases = ['icm-buddy','train-a-tiny-ai','ai-rover','classility','novels-library','crosswinds-in-sapa'];
  for (const slug of cases) {
    const route = `/work/${slug}/`;
    const result = await page.goto(base+route,{waitUntil:'networkidle'});
    check(result.status() === 200 && await page.locator('h1').count() === 1,`Case study opens directly: ${slug}`);
    await page.reload({waitUntil:'networkidle'});
    check(await page.locator('.case-section').count() >= 3,`Case study survives refresh: ${slug}`);
    const assets = await page.locator('.case-media img,.case-media source').evaluateAll(elements => elements.map(element => element.getAttribute('src')).filter(Boolean));
    for (const path of assets) check((await context.request.head(base+path)).status() === 200,`Case media resolves: ${slug} / ${path}`);
    if (slug === 'icm-buddy') {
      await page.screenshot({path:resolve(output,'desktop-case.png'),fullPage:true});
      const caseAxe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      check(!caseAxe.violations.length,'Case-study accessibility audit has no WCAG A/AA violations',caseAxe.violations.map(({id,impact}) => ({id,impact})));
    }
  }
  for (const [width,height] of [[1024,768],[768,1024],[390,844],[320,640],[720,450]]) {
    await page.setViewportSize({width,height});
    await page.goto(base,{waitUntil:'networkidle'});
    const dimensions = await page.evaluate(() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    check(dimensions.scroll <= dimensions.viewport+1,`No horizontal overflow at ${width}px`,dimensions);
    check(width >= 1024 || await page.locator('.hero').evaluate(element => getComputedStyle(element).position !== 'sticky'),`Touch-sized layout is unpinned at ${width}px`);
    if (width === 390 || width === 320) {
      await page.screenshot({path:resolve(output,`mobile-${width}-hero.png`)});
      await page.locator('#writing').scrollIntoViewIfNeeded();
      await page.locator('.book-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.screenshot({path:resolve(output,`mobile-${width}-writing.png`)});
      await page.locator('.menu-toggle').click();
      check(await page.locator('.site-nav').isVisible(),`Mobile navigation opens at ${width}px`);
      await page.keyboard.press('Escape');
      check(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false',`Mobile navigation closes with Escape at ${width}px`);
      await page.goto(base+'/work/icm-buddy/',{waitUntil:'networkidle'});
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1),`Case study fits at ${width}px`);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/novel/',{waitUntil:'networkidle'});
  await page.getByRole('searchbox',{name:'Search novels'}).fill('Second Skin');
  check(await page.getByRole('link',{name:/Second Skin/}).count() > 0,'Novel search works in the assembled site');
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button',{name:/Switch to .* mode/}).click();
  check(await page.locator('html').getAttribute('data-theme') !== theme,'Reader theme toggles');
  await page.goto(base+'/novel/second-skin/Chapter1/',{waitUntil:'networkidle'});
  check(await page.locator('.prose-reader').count() === 1,'Novel chapter is rendered');
  await page.getByRole('button',{name:'Reader settings',exact:true}).click();
  check(await page.getByRole('dialog',{name:'Reader settings'}).isVisible(),'Reader settings still open');
  await page.getByRole('combobox',{name:'Font family'}).selectOption('source');
  await page.getByRole('button',{name:'Close settings'}).click();
  await page.reload({waitUntil:'networkidle'});
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('reader-prefs') || '{}').fontId === 'source' && document.documentElement.style.getPropertyValue('--reader-font').includes('Source Serif')),'Reader preferences persist and apply after refresh');
  for (const path of ['/novel/second-skin/Chapter15/','/novel/as-if-you-never-left/EpilogueA/','/novel/as-if-you-never-left/EpilogueB/','/foryou.html','/hny.html','/vday.html']) {
    const result = await context.request.get(base+path); check(result.status() === 200,`Preserved route resolves: ${path}`);
  }
  await context.close();
  const reduced = await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:900}});
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base,{waitUntil:'networkidle'});
  check(await reducedPage.locator('html').getAttribute('data-motion') === 'off','Operating-system reduced motion is respected');
  check(await reducedPage.locator('.hero').evaluate(element => getComputedStyle(element).position !== 'sticky'),'Reduced motion removes pinning');
  await reducedPage.locator('.film-section').scrollIntoViewIfNeeded();
  await reducedPage.waitForTimeout(400);
  check(await reducedPage.locator('.film-section > figure > video').evaluate(video => video.paused),'Reduced motion suppresses decorative autoplay');
  await reduced.close();
  const noJS = await browser.newContext({javaScriptEnabled:false});
  const noJSPage = await noJS.newPage();
  await noJSPage.goto(base,{waitUntil:'networkidle'});
  check(await noJSPage.locator('h1').isVisible() && await noJSPage.locator('[data-project-category]').count() === 6 && await noJSPage.locator('.book-card').count() === 3,'Introduction, projects and writing exist without JavaScript');
  check(await noJSPage.locator('.workbench-fallback').count() === 1,'A composed workbench poster exists without JavaScript');
  await noJS.close();
  const noGL = await browser.newContext();
  await noGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type,...args) { return String(type).startsWith('webgl') ? null : original.call(this,type,...args); };
  });
  const noGLPage = await noGL.newPage();
  await noGLPage.goto(base,{waitUntil:'networkidle'});
  await noGLPage.waitForSelector('[data-scene-status="fallback"]');
  check(await noGLPage.locator('.workbench-fallback').isVisible(),'Unsupported WebGL uses the visible poster');
  await noGL.close();
  check(report.pageErrors.length === 0,'No portfolio or reader JavaScript errors',report.pageErrors);
} catch (error) { report.failures.push(error.message); }
finally {
  await browser.close();
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.checks.filter(item=>item.pass).length,failures:report.failures,accessibility:report.accessibility,measurements:report.measurements},null,2));
  if (report.failures.length) process.exitCode = 1;
}
