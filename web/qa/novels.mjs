import { createRequire } from 'node:module';
import { readdir, readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const require = createRequire(join(repo, 'showcase/package.json'));
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const base = (process.env.SITE_URL || 'http://127.0.0.1:4175').replace(/\/$/, '');
const out = resolve(here, 'artifacts');
const groupFilter = (process.env.QA_GROUPS || '').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
await mkdir(out, { recursive: true });
const report = { url: base, checks: [], failures: [], pageErrors: [], accessibility: [], measurements: {}, screenshots: [] };
function check(pass, label, detail) {
  const item = { label, pass: !!pass, ...(detail === undefined ? {} : { detail }) };
  report.checks.push(item);
  if (!pass) report.failures.push(item);
}
async function group(name, action) {
  if (groupFilter.length && !groupFilter.some(value=>name.toLowerCase().includes(value))) return;
  console.log('Checking: ' + name);
  try { await action(); } catch (error) { check(false, name, error.stack || error.message); }
}
const browser = await chromium.launch({ headless: true });
const contexts = [];
async function surface(options = {}, init) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...options });
  contexts.push(context);
  await context.addInitScript(() => {
    window.__novelPerf = { lcp: 0, cls: 0 };
    try { new PerformanceObserver(list => list.getEntries().forEach(entry => window.__novelPerf.lcp = entry.startTime)).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__novelPerf.cls += entry.value; })).observe({ type: 'layout-shift', buffered: true }); } catch {}
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push({ url: page.url(), message: error.message }));
  return { context, page };
}
async function visit(page, route) {
  const response = await page.goto(base + route, { waitUntil: 'networkidle' });
  check(response?.status() === 200, 'HTTP 200 ' + route);
  await page.evaluate(() => document.fonts.ready);
  return response;
}
async function screenshot(page, name, fullPage = false) {
  await page.evaluate(async () => {
    const visibleImages = [...document.images].filter(image => {
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    });
    await Promise.all(visibleImages.map(image => image.decode()));
  });
  await page.screenshot({ path: resolve(out, name + '.png'), fullPage, animations: 'disabled' });
  report.screenshots.push(name + '.png');
}
async function axe(page, label) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  report.accessibility.push({ label, violations: result.violations.map(({id, impact, nodes}) => ({id, impact, targets: nodes.map(node => node.target)})) });
  check(result.violations.length === 0, label + ' accessibility', result.violations.map(item => item.id));
}
async function noOverflow(page, label) {
  const measurements = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  check(measurements.scroll <= measurements.width + 1, label + ' fits viewport', measurements);
}
async function afterFrames(page) {
  await page.evaluate(async () => { for (let i=0; i<4; i++) await new Promise(requestAnimationFrame); });
}
async function dismiss(page) {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await afterFrames(page);
}
async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((element, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', {bubbles:true}));
    element.dispatchEvent(new Event('change', {bubbles:true}));
  }, value);
}
const { page } = await surface();

await group('Exported routes and optimized assets', async () => {
  const directories = (await readdir(join(repo, 'novel'), { withFileTypes: true })).filter(entry => entry.isDirectory());
  const routes = ['/novel/'];
  const missing = [];
  let chapters = 0;
  for (const entry of directories) {
    routes.push('/novel/' + entry.name + '/');
    const files = (await readdir(join(repo, 'novel', entry.name))).filter(file => /^Chapter\d+\.md$|^Epilogue.*\.md$/i.test(file));
    for (const file of files) { chapters++; routes.push('/novel/' + entry.name + '/' + file.slice(0,-3) + '/'); }
    for (const width of [320,640,960]) {
      try { await access(join(repo, 'images', entry.name + '-cover-' + width + '.webp')); } catch { missing.push(entry.name + ':' + width); }
    }
  }
  check(directories.length === 50 && chapters === 820, 'All 50 novels and 820 chapters retained', { books: directories.length, chapters });
  check(missing.length === 0, 'Responsive cover variants exist', missing);
  const queue = [...routes];
  const failures = [];
  await Promise.all(Array.from({length:8}, async () => {
    while (queue.length) {
      const route = queue.shift();
      const response = await page.request.get(base + route);
      if (response.status() !== 200) failures.push({route, status:response.status()});
    }
  }));
  check(failures.length === 0, 'All ' + routes.length + ' novel URLs return HTTP 200', failures);
});

await group('Library discovery and filters', async () => {
  await visit(page, '/novel/');
  check(await page.locator('.library-hero-book').count() === 3, 'Three featured cover worlds');
  check(await page.locator('.library-catalogue-book').count() === 50, 'Complete catalogue rendered');
  check(await page.locator('.library-series-caption').count() === 4, 'Four real series featured');
  check(await page.locator('h1').count() === 1, 'Library one main heading');
  await screenshot(page, 'library-desktop');
  await axe(page, 'Library dark');
  const search = page.getByRole('searchbox').first();
  await search.fill('Second Skin');
  await page.waitForFunction(() => document.querySelectorAll('.library-catalogue-book').length === 2);
  check(new URL(page.url()).searchParams.get('q') === 'Second Skin', 'Search updates share URL');
  await page.reload({waitUntil:'networkidle'});
  check(await search.inputValue() === 'Second Skin', 'Search persists on refresh');
  await search.fill('zzzz-no-story-matches');
  check(await page.locator('.library-empty').isVisible(), 'Search empty state');
  await page.getByRole('button', {name:'Show every novel'}).click();
  await page.getByRole('combobox', {name:/^Collection/}).selectOption('series');
  check(await page.locator('.library-catalogue-book').count() === 12, 'Connected stories filter includes actual 12 books');
  await page.getByRole('button', {name:'Clear filters'}).click();
  await page.getByRole('combobox', {name:/^Status/}).selectOption('incomplete');
  check(await page.locator('.library-catalogue-book').count() === 0, 'Incomplete is distinct from Complete');
  await page.getByRole('button', {name:'Show every novel'}).click();
  await page.getByRole('button', {name:'Switch to light mode'}).click();
  await axe(page, 'Library light');
  await page.getByRole('button', {name:'Switch to dark mode'}).click();
});

await group('Book introduction, chapter search and artwork dialogs', async () => {
  await visit(page, '/novel/second-skin/');
  check(await page.locator('.chapter-directory-row').count() > 0, 'Book chapters visible without mandatory overlay');
  check(await page.locator('h1').count() === 1, 'Book one main heading');
  check(await page.locator('.book-reading-order').isVisible(), 'Series reading order visible');
  await screenshot(page, 'book-desktop');
  await axe(page, 'Book introduction');
  const originalCount = await page.locator('.chapter-directory-row').count();
  await page.getByLabel('Search chapters', {exact:true}).fill('Chapter 1');
  check(await page.locator('.chapter-directory-row').count() < originalCount, 'Book chapter search narrows contents');
  await page.getByLabel('Search chapters', {exact:true}).fill('');
  const opener = page.locator('.cover-image').first();
  await opener.focus();
  const backgroundY = await page.evaluate(() => scrollY);
  const coverBox = await opener.boundingBox();
  await page.mouse.click(coverBox.x+coverBox.width/2,coverBox.y+Math.min(coverBox.height/2,200));
  await page.locator('dialog[open]').waitFor();
  check(await page.locator('dialog[open] img').count() > 0, 'Cover expands in native dialog');
  await axe(page, 'Cover dialog');
  for (let i=0; i<12; i++) await page.keyboard.press('Tab');
  check(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]')), 'Modal contains keyboard focus');
  await dismiss(page);
  check(await page.locator('dialog[open]').count() === 0, 'Escape dismisses artwork');
  check(await opener.evaluate(element => element === document.activeElement), 'Cover opener focus restored');
  check(Math.abs(await page.evaluate(() => scrollY) - backgroundY) < 2, 'Cover background position preserved', {before:backgroundY,after:await page.evaluate(()=>scrollY)});
  await visit(page, '/novel/second-skin-keyhole-protocol/');
  check(await page.locator('.book-gallery').isVisible(), 'Actual illustration gallery retained');
  await page.locator('.book-gallery').scrollIntoViewIfNeeded();
  await screenshot(page, 'book-gallery');
});

await group('Reader contents, appearance and focus behaviour', async () => {
  await visit(page, '/novel/the-last-stranger/Chapter1/');
  check(await page.locator('h1').count() === 1, 'Reader one main heading');
  check(await page.locator('.prose-reader p').count() > 20, 'Selectable story prose rendered');
  await screenshot(page, 'reader-desktop');
  await axe(page, 'Reader night');
  const contents = page.getByRole('button', {name:'Chapter contents', exact:true});
  await contents.click();
  await page.locator('dialog[open]').waitFor();
  await axe(page, 'Contents dialog');
  check(await page.locator('dialog[open] [aria-current="page"]').count() === 1, 'Contents identifies current chapter');
  await page.locator('dialog[open]').getByRole('searchbox').fill('Chapter 2');
  check(await page.locator('dialog[open] .reader-contents-list li').count() > 0, 'Reader chapter search works');
  const before = page.url();
  await page.keyboard.press('n');
  check(page.url() === before, 'Typing in modal cannot trigger chapter shortcuts');
  await dismiss(page);
  check(await contents.evaluate(element => element === document.activeElement), 'Contents focus restored');
  const appearance = page.getByRole('button', {name:'Reading appearance'});
  await appearance.click();
  await page.locator('dialog[open]').waitFor();
  await axe(page, 'Appearance dialog');
  await screenshot(page, 'reader-settings');
  for (const theme of ['Dim','Paper','Sepia','Night']) {
    await page.locator('dialog[open]').getByRole('button', {name:new RegExp('^'+theme)}).click();
    check(await page.evaluate(() => document.documentElement.dataset.readerTheme) === theme.toLowerCase(), theme + ' reader theme applies');
  }
  await dismiss(page);
  await page.getByRole('button', {name:'Enter focus mode'}).click();
  await page.evaluate(() => scrollTo({top:1400,behavior:'instant'}));
  await afterFrames(page);
  await appearance.focus();
  check(await page.locator('.reader-toolbar').evaluate(element => element.getBoundingClientRect().bottom > 0), 'Focused toolbar remains reachable in focus mode');
  await page.getByRole('button', {name:'Leave focus mode'}).click();
  await appearance.click();
  await page.getByRole('combobox', {name:/^Typeface/}).selectOption('atkinson');
  await dismiss(page);
  await page.evaluate(() => document.fonts.ready);
  check(await page.locator('.prose-reader').evaluate(element => getComputedStyle(element).fontFamily.includes('Atkinson')), 'Legacy accessible font available');
  await appearance.click();
  await page.getByRole('button', {name:'Restore defaults'}).click();
  await dismiss(page);
});

await group('Paragraph resume, reflow and browser history', async () => {
  await visit(page, '/novel/the-last-stranger/Chapter1/');
  await page.evaluate(() => {
    const blocks = [...document.querySelectorAll('.prose-reader p, .prose-reader h2, .prose-reader h3, .prose-reader h4, .prose-reader li, .prose-reader hr')];
    const target = blocks[Math.min(24, blocks.length-5)].getBoundingClientRect();
    scrollTo({top:scrollY+target.top+target.height*.35-104,behavior:'instant'});
  });
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger') || '{}').paragraph > 10);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger')));
  await page.reload({waitUntil:'networkidle'});
  await page.getByText('Back where you left off.', {exact:true}).waitFor();
  const resumed = await page.evaluate(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger')));
  check(Math.abs(saved.paragraph-resumed.paragraph) <= 1, 'Refresh resumes same paragraph', {saved, resumed});
  await page.getByRole('button', {name:'Reading appearance'}).click();
  await page.getByRole('combobox', {name:/^Typeface/}).selectOption('system-sans');
  await setRange(page,'#reader-font-size',1.3);
  await setRange(page,'#reader-page-width',940);
  await dismiss(page);
  await page.waitForTimeout(500);
  const changed = await page.evaluate(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger')));
  check(Math.abs(saved.paragraph-changed.paragraph) <= 1, 'Font and width changes preserve paragraph', {saved, changed});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(500);
  const resized = await page.evaluate(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger')));
  check(Math.abs(saved.paragraph-resized.paragraph) <= 1, 'Viewport resize preserves paragraph', {saved, resized});
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('n');
  await page.waitForURL('**/Chapter2/');
  await page.goBack({waitUntil:'networkidle'});
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => JSON.parse(localStorage.getItem('bookmark:the-last-stranger')));
  check(back.chapterSlug === 'Chapter1' && Math.abs(saved.paragraph-back.paragraph) <= 1, 'Back restores this history entry position', {saved, back});
  await page.goForward({waitUntil:'networkidle'});
  check(page.url().includes('/Chapter2/'), 'Forward restores next chapter route');
  await visit(page, '/novel/');
  check(await page.locator('.library-continue-book').count() > 0, 'Library Continue reading shelf uses saved progress');
  check((await page.locator('.library-continue-book').first().getAttribute('href')).includes('resume=1'), 'Continue links explicitly resume position');
});

await group('Ending navigation', async () => {
  await page.setViewportSize({width:1440,height:1000});
  await visit(page, '/novel/the-warmth-you-asked-for/Chapter21/');
  check(await page.locator('.reader-chapter-label').innerText() === 'Epilogue I', 'Roman I is a sequential epilogue');
  check(await page.locator('.reader-next-link').getAttribute('href') === '/novel/the-warmth-you-asked-for/Chapter22/', 'Roman I leads to Roman II');
  await visit(page, '/novel/as-if-you-never-left/');
  check(await page.getByRole('heading', {name:'Alternate endings',exact:true}).count() === 1, 'Genuine parallel endings shown distinctly');
  const branchRows = page.locator('.chapter-directory-group').filter({has:page.getByRole('heading',{name:'Alternate endings',exact:true})}).locator('a');
  const branch = await branchRows.first().getAttribute('href');
  await visit(page, branch);
  check(await page.locator('.reader-ending-note').isVisible(), 'Parallel ending offers the other path');
  check((await page.locator('.reader-next-link').getAttribute('href')) === '/novel/as-if-you-never-left/', 'Parallel endings return to book, no forced cross-branch next');
});

await group('Phone, 320px, spacing and no-JavaScript', async () => {
  const {page:phone} = await surface({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  for (const [route,name] of [['/novel/','library-mobile'],['/novel/second-skin/','book-mobile'],['/novel/the-last-stranger/Chapter1/','reader-mobile']]) {
    await visit(phone, route); await noOverflow(phone,name); await screenshot(phone,name); await axe(phone,name);
  }
  await phone.getByRole('button',{name:'Reading appearance'}).click();
  check(await phone.locator('dialog[open]').evaluate(element => Math.abs(element.getBoundingClientRect().width-innerWidth)<2), 'Phone modal fills width');
  await noOverflow(phone,'Phone settings');
  await dismiss(phone);
  await phone.setViewportSize({width:320,height:700});
  for (const route of ['/novel/','/novel/second-skin/','/novel/the-last-stranger/Chapter1/']) { await visit(phone,route); await noOverflow(phone,'320px '+route); }
  await screenshot(phone,'reader-320');
  await phone.addStyleTag({content:'.prose-reader { line-height:1.5!important; letter-spacing:.12em!important; word-spacing:.16em!important; } .prose-reader p { margin-bottom:2em!important; }'});
  await noOverflow(phone,'User text spacing overrides');
  const {page:staticPage} = await surface({javaScriptEnabled:false,viewport:{width:320,height:700}});
  for (const route of ['/novel/','/novel/second-skin/','/novel/the-last-stranger/Chapter1/']) { await visit(staticPage,route); await noOverflow(staticPage,'NoJS '+route); }
  check(await staticPage.locator('.prose-reader p').count()>20,'Reader prose available without JavaScript');
  check(await staticPage.locator('.reader-next-link').getAttribute('href') === '/novel/the-last-stranger/Chapter2/','NoJS next chapter navigation');
  await staticPage.goto(base+'/novel/');
  check(await staticPage.locator('.library-catalogue-book').count()===50,'NoJS complete 50-book catalogue');
});

await group('Reduced motion, malformed preferences and blocked storage', async () => {
  const {page:reduced} = await surface({reducedMotion:'reduce'});
  await visit(reduced,'/novel/');
  await reduced.evaluate(() => scrollTo(0,250));
  check(await reduced.locator('.library-hero').evaluate(element => getComputedStyle(element).getPropertyValue('--library-drift').trim()==='0'),'Reduced motion disables cover drift');
  const {page:bad} = await surface({}, () => {
    localStorage.setItem('reader-prefs', JSON.stringify({fontScale:999,lineHeight:-20,width:NaN,fontId:'missing',theme:'unknown'}));
    localStorage.setItem('bookmark:the-last-stranger','{"chapterSlug":"../../oops","chapterLabel":"Wrong","chapterTitle":"Wrong","ts":1}');
  });
  await visit(bad,'/novel/the-last-stranger/Chapter1/?resume=1');
  const prefs = await bad.evaluate(() => ({scale:document.documentElement.style.getPropertyValue('--reader-font-scale'),line:document.documentElement.style.getPropertyValue('--reader-line-height'),width:document.documentElement.style.getPropertyValue('--reader-max-width'),font:document.documentElement.style.getPropertyValue('--reader-font')}));
  check(prefs.scale==='1.4'&&prefs.line==='1.45'&&prefs.width==='720px'&&prefs.font.includes('Literata'),'Malformed preferences clamp and fall back',prefs);
  const {page:blocked} = await surface({}, () => {
    Storage.prototype.getItem=()=>{throw new DOMException('Unavailable','SecurityError');};
    Storage.prototype.setItem=()=>{throw new DOMException('Unavailable','SecurityError');};
  });
  await visit(blocked,'/novel/');
  await blocked.getByRole('searchbox').first().fill('Second Skin');
  await blocked.waitForFunction(() => document.querySelectorAll('.library-catalogue-book').length === 2);
  check(await blocked.locator('.library-catalogue-book').count()===2,'Search works when storage unavailable');
  await visit(blocked,'/novel/the-last-stranger/Chapter1/');
  await blocked.getByRole('button',{name:'Reading appearance'}).click();
  await blocked.getByRole('button',{name:/^Sepia/}).click();
  check(await blocked.evaluate(()=>document.documentElement.dataset.readerTheme)==='sepia','Settings work when storage unavailable');
});

await group('Cold-cache mobile performance', async () => {
  const {page:mobile,context} = await surface({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cdp=await context.newCDPSession(mobile);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:200000,uploadThroughput:93750});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const [key,route] of [['library','/novel/'],['reader','/novel/the-last-stranger/Chapter1/']]) {
    await mobile.goto(base+route,{waitUntil:'networkidle'});
    await mobile.waitForTimeout(750);
    const metrics=await mobile.evaluate(()=>window.__novelPerf);
    report.measurements[key]={...metrics,profile:'Chromium,390x844,4xCPU,1.6Mbps,80ms latency,cold cache'};
    check(metrics.lcp>0&&metrics.lcp<2500,key+' mobile LCP below2.5s',metrics);
    check(metrics.cls<.1,key+' mobile CLS below0.1',metrics);
  }
});

check(report.pageErrors.length===0,'No browser JavaScript errors',report.pageErrors);
await writeFile(resolve(out,groupFilter.length ? 'report-targeted.json' : 'report.json'),JSON.stringify(report,null,2));
for(const context of contexts) await context.close();
await browser.close();
console.log(JSON.stringify({checks:report.checks.length,failures:report.failures,errors:report.pageErrors,measurements:report.measurements,screenshots:report.screenshots.length},null,2));
if(report.failures.length) process.exitCode=1;
