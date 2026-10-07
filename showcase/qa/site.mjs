import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// SITE_URL selects the assembled preview. QA_SCOPE=portfolio permits dev smoke QA.
// QA_GROUPS is an optional comma-separated list of group-name substrings.
const base = (process.env.SITE_URL || 'http://127.0.0.1:4174').replace(/\/$/, '');
const portfolioOnly = process.env.QA_SCOPE === 'portfolio';
const groupFilter = (process.env.QA_GROUPS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
const output = resolve(dirname(fileURLToPath(import.meta.url)), 'artifacts');
await mkdir(output, { recursive: true });
const cases = ['icm-buddy','train-a-tiny-ai','ai-rover','classility','novels-library','crosswinds-in-sapa'];
const experiments = ['potionality','chip-challenge','silicon-self','age-of-war','nizam','tetris'];
const slugs = [...cases, ...experiments];
const size = { width:1440, height:1000 };
const report = { url:base, scope:portfolioOnly ? 'portfolio':'assembled', checks:[], failures:[], groups:[], skipped:[], pageErrors:[], accessibility:[], measurements:{}, screenshots:[] };
function check(pass,label,detail) {
  report.checks.push({ label, pass:!!pass, ...(detail === undefined ? {} : { detail }) });
  if (!pass) report.failures.push(label);
}
async function group(name,action) {
  if(groupFilter.length && !groupFilter.some(value => name.toLowerCase().includes(value))) {
    report.skipped.push(name + ': QA_GROUPS filter');
    return;
  }
  const before = report.failures.length;
  const started = Date.now();
  console.log('Checking: '+name);
  try { await action(); } catch(error) { check(false,name + ': ' + error.message); }
  report.groups.push({ name, pass:before === report.failures.length, milliseconds:Date.now()-started });
}
const browser = await chromium.launch({ headless:true });
const contexts = new Set();
const sceneRequests = new Set();
const heavyChunk = url => /WorkbenchScene|(?:^|\/)three(?:[.\-/])|react-three/i.test(new URL(url).pathname);
let context, page, entries;
async function newPage(options = {}, init) {
  const ctx = await browser.newContext({ viewport:size, ...options });
  contexts.add(ctx);
  await ctx.addInitScript(() => {
    window.__qa = { draws:0, hooks:0, chapters:[], modals:[], cls:0, lcp:0 };
    for (const name of ['WebGLRenderingContext','WebGL2RenderingContext']) {
      const prototype = window[name]?.prototype;
      if (!prototype) continue;
      for (const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
        const original = prototype[method];
        if (!original) continue;
        try {
          prototype[method] = function(...args) { window.__qa.draws++; return original.apply(this,args); };
          window.__qa.hooks++;
        } catch {}
      }
    }
    window.addEventListener('portfolio:chapter',event => window.__qa.chapters.push(event.detail));
    window.addEventListener('portfolio:modal',event => window.__qa.modals.push(event.detail));
    try { new PerformanceObserver(list => list.getEntries().forEach(entry => { window.__qa.lcp = entry.startTime; })).observe({ type:'largest-contentful-paint',buffered:true }); } catch {}
    try { new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__qa.cls += entry.value; })).observe({ type:'layout-shift',buffered:true }); } catch {}
  });
  if (init) await ctx.addInitScript(init);
  const target = await ctx.newPage();
  target.setDefaultTimeout(10000);
  target.on('pageerror',error => report.pageErrors.push({ url:target.url(),message:error.message }));
  target.on('request',request => { if (heavyChunk(request.url())) sceneRequests.add(request.url()); });
  return { context:ctx,page:target };
}
async function closeContext(ctx) { await ctx.close(); contexts.delete(ctx); }
async function frames(target = page,count = 2) {
  await target.evaluate(async count => { for(let i=0;i<count;i++) await new Promise(requestAnimationFrame); },count);
}
async function home(target = page,hash = '') {
  await target.evaluate(() => { try { localStorage.removeItem('fieldbook-motion'); } catch {} });
  const response = await target.goto(base + '/' + hash,{ waitUntil:'domcontentloaded' });
  await target.waitForSelector('html[data-experience-ready="true"]',{state:'attached'});
  await target.evaluate(() => document.fonts.ready);
  await frames(target);
  if(!entries) entries = await target.locator('dialog[data-project-dialog]').evaluateAll(dialogs => dialogs.map(dialog => ({slug:dialog.dataset.projectDialog,title:dialog.querySelector('.detail-title').textContent.trim()})));
  return response;
}
async function screenshot(name,target = page) {
  await target.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('.book-card img')].map(async image => { image.loading='eager'; await image.decode(); }));
  });
  await target.screenshot({ path:resolve(output,name + '.png'),animations:'disabled' });
  report.screenshots.push(name + '.png');
}
async function pointerClick(locator,target = page) {
  // Locator.click() may scroll a sticky control's original layout box.
  // Dispatch an actual pointer click at its currently visible rectangle.
  const box = await locator.boundingBox();
  if (!box || box.y < 0 || box.y + box.height > target.viewportSize().height + 1) throw new Error('Pointer target is outside the visible viewport');
  await target.mouse.click(box.x + box.width/2,box.y + box.height/2);
}
async function chapter(key,progress,target = page) {
  await target.evaluate(({key,progress}) => {
    const element = document.querySelector('[data-scroll-chapter="' + key + '"]');
    const pin = element.querySelector('.chapter-pin');
    const header = document.querySelector('.site-header').getBoundingClientRect().height;
    const distance = Math.max(1,element.offsetHeight-pin.offsetHeight);
    window.scrollTo({ top:Math.max(0,element.getBoundingClientRect().top+scrollY-header+distance*progress),behavior:'instant' });
  },{key,progress});
  await target.waitForFunction(({key,progress}) => {
    const element = document.querySelector('[data-scroll-chapter="' + key + '"]');
    return Math.abs(Number(element.dataset.progress)-progress) < .025 && element.dataset.chapterActive === 'true';
  },{key,progress});
  await frames(target);
}
async function jump(slug,target = page) {
  await chapter('projects',0,target);
  await pointerClick(target.locator('[data-project-jump="' + slug + '"]'),target);
  await target.waitForFunction(slug => {
    const stage = document.querySelector('[data-project-stage="' + slug + '"]');
    return stage.dataset.active === 'true' && Math.abs(stage.getBoundingClientRect().left) < 2;
  },slug);
  await frames(target);
}
async function activeModal(slug,target = page) {
  await target.waitForSelector('[data-project-dialog="' + slug + '"][open]');
  await target.waitForFunction(slug => location.pathname === '/' && location.hash === '#project/'+slug && document.documentElement.dataset.modal === 'open',slug);
  await frames(target);
  return target.locator('[data-project-dialog="' + slug + '"]');
}
async function closed(target = page,y) {
  await target.waitForFunction(() => !document.querySelector('dialog[open]') && document.documentElement.dataset.modal === 'closed');
  if(y !== undefined) await target.waitForFunction(y => Math.abs(scrollY-y) < 1,y);
  await frames(target,3);
}
async function opener(slug,target = page,stacked = false) {
  if(cases.includes(slug) && !stacked) await jump(slug,target);
  const link = target.locator(cases.includes(slug) ? '[data-project-stage="'+slug+'"] .project-actions [data-project-open]' : '.experiment-actions [data-project-open="'+slug+'"]');
  if(!cases.includes(slug) || stacked) { await link.scrollIntoViewIfNeeded(); await frames(target); }
  return link;
}
async function overflow(target = page) { return target.evaluate(() => ({ viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth })); }
async function axe(label,target = page) {
  const result = await new AxeBuilder({page:target}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const violations = result.violations.map(({id,impact,description,nodes}) => ({id,impact,description,elements:nodes.map(node => node.target)}));
  report.accessibility.push({ label,violations });
  check(!violations.length,label + ' has no WCAG A/AA violations',violations);
}
async function steadyDraws(target = page) {
  // Short sampling windows measure suspension rather than pixel appearance.
  await target.waitForTimeout(150);
  const before = await target.evaluate(() => window.__qa.draws);
  await target.waitForTimeout(250);
  const after = await target.evaluate(() => window.__qa.draws);
  return {before,after};
}
try {
  ({context,page} = await newPage());

  await group('On-page stories, media and native identities',async () => {
    const response = await home();
    check(response.status() === 200 && (await page.title()).includes('Aleem Siddique'),'Portfolio is served directly at root');
    check(await page.locator('h1').count() === 1 && (await page.locator('h1').textContent()).includes('Engineering'),'Homepage has one clear portfolio introduction');
    check(await page.locator('html').getAttribute('data-cinematic') === 'on','Fine-pointer desktop enables cinematic scroll chapters');
    entries = await page.locator('dialog[data-project-dialog]').evaluateAll(dialogs => dialogs.map(dialog => ({ slug:dialog.dataset.projectDialog,title:dialog.querySelector('.detail-title').textContent.trim() })));
    check(entries.length === 12 && new Set(entries.map(item => item.slug)).size === 12 && slugs.every(slug => entries.some(item => item.slug === slug)),'All 12 unique project files are present');
    check(await page.locator('main > section [data-project-stage]').count() === 6 && await page.locator('main > section .experiment-tile').count() === 6 && await page.locator('.book-card').count() === 3,'All six detailed stories, six experiments and three books are on the main page');
    for(const slug of cases) {
      const stage = page.locator('[data-project-stage="'+slug+'"]');
      const facts = await stage.locator('.project-facts').evaluate(element => [...element.querySelectorAll('div')].map(item => ({ label:item.querySelector('dt').textContent.trim(),text:item.querySelector('dd').textContent.trim() })));
      check(facts.length === 2 && facts[0].label === 'My contribution' && facts[1].label === 'Outcome' && facts.every(fact => fact.text.length > 40),'Specific contribution and outcome appear without a popup: '+slug,facts);
      check(await stage.locator('.project-demo img,.project-demo video').count() === 1 && (await stage.locator('figcaption').textContent()).trim().length > 20,'Captioned real preview or demonstration appears on-page: '+slug);
      if(await stage.locator('video').count()) check(await stage.locator('video').getAttribute('controls') !== null && await stage.locator('video source').count() === 2,'On-page video has native controls and both formats: '+slug);
    }
    const career = await page.locator('#experience').innerText();
    check(career.includes('My team and I') && career.includes('2024') && !career.includes('patent'),'Career distinguishes team contribution and dated recognition');
    const ids = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
    check(ids.length === new Set(ids).size,'Homepage and hidden project files have unique HTML IDs');
    const logoIds = [];
    let bytes = 0;
    for(const slug of slugs) {
      const response = await context.request.get(base+'/showcase-assets/logos/'+slug+'.svg');
      const source = await response.text();
      bytes += Buffer.byteLength(source);
      check(response.status() === 200 && /image\/svg\+xml/.test(response.headers()['content-type'] || ''),'Logo resolves as SVG: '+slug);
      const shape = await page.evaluate(svg => {
        const document = new DOMParser().parseFromString(svg,'image/svg+xml');
        return { valid:!document.querySelector('parsererror'),viewBox:document.documentElement.getAttribute('viewBox'),forbidden:document.querySelectorAll('image,text,script,foreignObject').length,geometry:document.querySelectorAll('path,circle,rect,polygon,polyline,line,ellipse').length,ids:[...document.querySelectorAll('[id]')].map(element => element.id),external:[...document.querySelectorAll('[href]')].some(element => !element.getAttribute('href').startsWith('#')) };
      },source);
      logoIds.push(...shape.ids);
      check(shape.valid && shape.viewBox === '0 0 128 128' && !shape.forbidden && !shape.external && shape.geometry > 0,'Logo is native vector mark geometry: '+slug,shape);
    }
    check(logoIds.length === new Set(logoIds).size,'SVG definition and title IDs are unique across all 12 marks');
    report.measurements.logoBytes = bytes;
    const assets = await page.locator('main > section img,main > section source').evaluateAll(elements => elements.flatMap(element => [element.getAttribute('src'),element.getAttribute('srcset')]).filter(src => src?.startsWith('/')));
    for(const path of new Set(assets)) check((await context.request.head(base+path)).status() === 200,'Homepage media resolves: '+path);
    await screenshot('desktop-hero');
  });
  await group('Hero controls and five scroll-driven chapters',async () => {
    await home();
    await page.waitForSelector('[data-scene-status="ready"],[data-scene-status="fallback"]',{timeout:30000});
    const status = await page.locator('[data-scene-status]').getAttribute('data-scene-status');
    check(status === 'ready','Default desktop renders the interactive 3D workbench',{status});
    for(const world of ['lens','circuit','book']) {
      await chapter('hero',.03);
      await pointerClick(page.locator('[data-workbench-select="'+world+'"]'));
      await page.waitForFunction(world => document.querySelector('[data-workbench-select="'+world+'"]').getAttribute('aria-pressed') === 'true' && !document.querySelector('[data-hero-phase="'+world+'"]').hidden,world);
      check(await page.locator('[data-focus-caption="'+world+'"]').isVisible(),'Hero control selects and describes '+world);
    }
    await page.locator('[data-workbench-select="lens"]').focus();
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.activeElement?.dataset.workbenchSelect === 'circuit' && getComputedStyle(document.activeElement).outlineStyle !== 'none'),'Hero controls are keyboard reachable with visible focus');
    await page.keyboard.press('Enter');
    check(await page.locator('[data-workbench-select="circuit"]').getAttribute('aria-pressed') === 'true','Keyboard activates the Circuit world');
    for(const key of ['hero','career','projects','writing','experiments']) {
      const snapshots = [];
      for(const progress of [.15,.85]) {
        await chapter(key,progress);
        snapshots.push(await page.locator('[data-scroll-chapter="'+key+'"]').evaluate((element,key) => ({
          progress:Number(element.dataset.progress),active:element.dataset.chapterActive,pinned:getComputedStyle(element.querySelector('.chapter-pin')).position,
          transform:getComputedStyle(element.querySelector(key === 'projects' ? '.project-track' : key === 'writing' ? '.book-cover' : key === 'experiments' ? '.experiment-mark' : '.chapter-pin')).transform,
          selected:key === 'hero' ? document.querySelector('[data-workbench-select][aria-pressed="true"]').dataset.workbenchSelect : key === 'career' ? element.querySelector('[data-career-beat].is-active')?.dataset.careerBeat : null,
        }),key));
      }
      check(snapshots.every(item => item.active === 'true' && item.pinned === 'sticky') && snapshots[1].progress > snapshots[0].progress+.65,'Scroll drives pinned '+key+' progress',snapshots);
      if(['projects','writing','experiments'].includes(key)) check(snapshots[0].transform !== snapshots[1].transform && snapshots[1].transform !== 'none','Visible geometry transforms with '+key+' scroll',snapshots.map(item => item.transform));
      if(key === 'hero') check(snapshots[0].selected === 'lens' && snapshots[1].selected === 'book','Hero scroll changes the rendered world from Lens to Book');
      if(key === 'career') check(snapshots[0].selected === '0' && snapshots[1].selected === '2','Career scroll reveals bring-up then recognition');
    }
    const events = await page.evaluate(() => window.__qa.chapters);
    check(['hero','career','projects','writing','experiments'].every(key => events.some(event => event.key === key && event.active && event.progress > .1)),'All five chapters emit active progress events');
    const draw = await page.evaluate(() => ({count:window.__qa.draws,hooks:window.__qa.hooks}));
    check(draw.count > 0,'Interactive scene performs actual WebGL draws',draw);
    report.measurements.desktopUnthrottled = await page.evaluate(() => ({cls:window.__qa.cls,lcp:window.__qa.lcp,transferBytes:performance.getEntriesByType('resource').reduce((sum,entry) => sum+entry.transferSize,0)}));
    for(const [key,name] of [['career','desktop-career'],['writing','desktop-writing'],['experiments','desktop-experiments']]) { await chapter(key,.7); await screenshot(name); }
  });
  await group('Desktop project jumps and offscreen keyboard alignment',async () => {
    await home();
    for(const slug of cases) {
      await jump(slug);
      const bounds = await page.locator('[data-project-stage="'+slug+'"]').evaluate(element => ({left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right,active:element.dataset.active}));
      check(bounds.active === 'true' && Math.abs(bounds.left) < 2 && Math.abs(bounds.right-size.width) < 2,'Project jump aligns the visible pane: '+slug,bounds);
      check(await page.locator('[data-project-jump="'+slug+'"]').getAttribute('aria-current') === 'true' && new URL(page.url()).hash === '#stage-'+slug,'Project jump announces and shares the current stage: '+slug);
    }
    await jump(cases[0]);
    for(let index=0;index<cases.length-1;index++) {
      await page.locator('[data-project-stage="'+cases[index]+'"] .project-actions a').last().focus();
      const slug = cases[index+1];
      // Native video controls are legitimate Tab stops between consecutive panes.
      // Traverse them rather than assuming the next pane is one Tab away.
      let reached = false;
      for(let step=0;step<20;step++) {
        await page.keyboard.press('Tab');
        await frames(page,1);
        reached = await page.evaluate(slug => document.activeElement.closest('[data-project-stage]')?.dataset.projectStage === slug,slug);
        if(reached) break;
      }
      check(reached,'Keyboard can reach the next project through native video controls: '+slug);
      await page.waitForFunction(slug => { const stage=document.querySelector('[data-project-stage="'+slug+'"]'); return stage.dataset.active === 'true' && Math.abs(stage.getBoundingClientRect().left) < 2; },slug);
      const focus = await page.evaluate(() => ({slug:document.activeElement.closest('[data-project-stage]')?.dataset.projectStage,left:document.activeElement.getBoundingClientRect().left,right:document.activeElement.getBoundingClientRect().right,outline:getComputedStyle(document.activeElement).outlineStyle,railScroll:document.querySelector('.project-viewport').scrollLeft}));
      check(focus.slug === slug && focus.left >= 0 && focus.right <= size.width && focus.outline !== 'none' && focus.railScroll === 0,'Tab brings the next offscreen project control into view: '+slug,focus);
    }
    await screenshot('desktop-project');
  });

  await group('All twelve ordinary links, dialog dismissal and exact restoration',async () => {
    await home();
    for(let index=0;index<slugs.length;index++) {
      const slug = slugs[index];
      const link = await opener(slug);
      if(index === 0) { await page.evaluate(() => scrollBy({top:80,behavior:'instant'})); await frames(page,3); }
      await link.evaluate((element,slug) => { element.dataset.qaOpener=slug; },slug);
      const before = await page.evaluate(() => ({y:scrollY,url:location.pathname+location.search+location.hash}));
      await pointerClick(link);
      const dialog = await activeModal(slug);
      check(await dialog.getAttribute('aria-labelledby') === 'dialog-'+slug+'-title' && (await dialog.locator('.detail-title').textContent()).trim() === entries.find(entry => entry.slug === slug).title,'Ordinary link opens its correctly named file at root: '+slug);
      check(await page.locator('dialog[open]').count() === 1 && await page.evaluate(() => document.body.style.position === 'fixed' && document.documentElement.style.overflow === 'hidden'),'Exactly one dialog locks the background: '+slug);
      check(await dialog.locator('a[href]').count() > 1,'Project dialog retains ordinary source/experience links: '+slug);
      for(let tab=0;tab<3;tab++) {
        await page.keyboard.press('Tab');
        check(await page.evaluate(slug => document.activeElement?.closest('dialog')?.dataset.projectDialog === slug,slug),'Native dialog contains keyboard focus: '+slug+' / '+(tab+1));
      }
      if(index%2) await pointerClick(dialog.locator('[data-dialog-close]')); else await page.keyboard.press('Escape');
      await closed(page,before.y);
      const restored = await page.evaluate(slug => ({y:scrollY,url:location.pathname+location.search+location.hash,focused:document.activeElement?.dataset.qaOpener === slug}),slug);
      check(Math.abs(restored.y-before.y) < 1 && restored.focused && restored.url === before.url,'Dismissal restores exact scroll, original URL and opener focus: '+slug,{before,restored,method:index%2 ? 'Close':'Escape'});
    }
  });
  await group('Desktop resize, direct stage hashes and modal geometry',async () => {
    await page.setViewportSize(size);
    await home(page,'#stage-classility');
    await page.waitForFunction(() => {
      const stage=document.querySelector('[data-project-stage="classility"]');
      return stage.dataset.active === 'true' && Math.abs(stage.getBoundingClientRect().left) < 2;
    });
    check(await page.locator('[data-project-jump="classility"]').getAttribute('aria-current') === 'true','A directly loaded stage hash aligns the intended project after initialization');
    for(const dimensions of [{width:1024,height:768},{width:390,height:844},{width:1280,height:900},size]) {
      await page.setViewportSize(dimensions);
      await page.waitForFunction(width => {
        const stage=document.querySelector('[data-project-stage="classility"]');
        const bounds=stage.getBoundingClientRect();
        return stage.dataset.active === 'true' && (width >= 1024 ? Math.abs(bounds.left) < 2 : bounds.top < innerHeight && bounds.bottom > document.querySelector('.site-header').getBoundingClientRect().bottom);
      },dimensions.width);
      const pane = await page.locator('[data-project-stage="classility"]').evaluate(element => ({active:element.dataset.active,left:element.getBoundingClientRect().left,railScroll:document.querySelector('.project-viewport').scrollLeft,mode:document.documentElement.dataset.cinematic}));
      check(pane.active === 'true' && (dimensions.width < 1024 || Math.abs(pane.left) < 2) && pane.railScroll === 0 && pane.mode === (dimensions.width >= 1024 ? 'on':'off'),'Resize preserves the current project and expected presentation at '+dimensions.width+'px',pane);
    }
    const link = await opener('classility');
    await link.evaluate(element => { element.dataset.qaOpener='resize-classility'; });
    await pointerClick(link); await activeModal('classility');
    await page.setViewportSize({width:390,height:844}); await frames(page,4);
    check(await page.locator('dialog[open]').evaluate(element => element.getBoundingClientRect().width <= innerWidth+1),'An open dialog adapts to a mobile viewport');
    await page.keyboard.press('Escape'); await closed();
    const restored = await link.evaluate(element => ({top:element.getBoundingClientRect().top,bottom:element.getBoundingClientRect().bottom,focused:document.activeElement === element,header:document.querySelector('.site-header').getBoundingClientRect().bottom,height:innerHeight}));
    check(restored.focused && restored.top >= restored.header-1 && restored.bottom <= restored.height+1,'Closing after a modal resize restores a visible matching opener instead of obsolete pixels',restored);
    await page.setViewportSize(size);
    await page.waitForFunction(() => {
      const stage=document.querySelector('[data-project-stage="classility"]');
      return stage.dataset.active === 'true' && Math.abs(stage.getBoundingClientRect().left) < 2;
    });
    check(await page.locator('[data-project-stage="classility"]').getAttribute('data-active') === 'true','Returning to desktop after modal resize retains the same project');
  });
  await group('Dialog session history, direct hashes and refresh',async () => {
    await home();
    const link = await opener('icm-buddy');
    const before = await page.evaluate(() => ({y:scrollY,length:history.length,url:location.pathname+location.hash}));
    await pointerClick(link);
    const first = await activeModal('icm-buddy');
    const session = await page.evaluate(() => history.state.cinematicProject.session);
    await first.locator('.dialog-project-nav [data-project-open="train-a-tiny-ai"]').click();
    await activeModal('train-a-tiny-ai');
    check(await page.evaluate(data => history.length === data.length+1 && history.state.cinematicProject.session === data.session,{length:before.length,session}),'Switching project replaces the modal session rather than adding a Back step');
    await page.evaluate(() => history.back());
    await closed(page,before.y);
    check(await page.evaluate(url => location.pathname+location.hash === url,before.url),'Back closes the entire modal session at the original page');
    await page.evaluate(() => history.forward());
    await activeModal('train-a-tiny-ai');
    check((await page.locator('dialog[open] .detail-title').textContent()).trim() === entries.find(entry => entry.slug === 'train-a-tiny-ai').title,'Forward reopens the last selected project file');
    await page.keyboard.press('Escape'); await closed(page,before.y);
    for(const slug of ['icm-buddy','classility','potionality']) {
      await home(page,'#project/'+slug);
      await activeModal(slug);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForSelector('html[data-experience-ready="true"]',{state:'attached'});
      const dialog = await activeModal(slug);
      await pointerClick(dialog.locator('[data-dialog-close]')); await closed();
      const url = new URL(page.url());
      check(url.origin === new URL(base).origin && url.pathname === '/' && url.hash === (cases.includes(slug) ? '#work':'#experiments'),'Refreshed direct hash closes inside the portfolio: '+slug);
      check(await page.evaluate(slug => document.activeElement.dataset.projectOpen === slug,slug),'Direct hash close focuses its matching card: '+slug);
    }
  });
  await group('Background suspension and manual modal video controls',async () => {
    await home();
    await page.waitForSelector('[data-scene-status="ready"]',{timeout:30000});
    await chapter('hero',.14); await page.mouse.move(1180,320);
    await pointerClick(page.locator('[data-hero-phase="lens"] [data-project-open="icm-buddy"]'));
    await activeModal('icm-buddy');
    const draw = await steadyDraws();
    check(draw.before === draw.after,'Opening a dialog suspends the visible WebGL draw loop',draw);
    check(await page.locator('main > section video').evaluateAll(videos => videos.every(video => video.paused)),'Background demonstration videos pause while a dialog is open');
    await page.keyboard.press('Escape'); await closed();
    await jump('icm-buddy');
    const background = page.locator('[data-project-stage="icm-buddy"] video');
    await background.evaluate(video => video.play());
    await page.waitForFunction(() => !document.querySelector('[data-project-stage="icm-buddy"] video').paused);
    await pointerClick(page.locator('[data-project-stage="icm-buddy"] .project-actions [data-project-open]'));
    await activeModal('icm-buddy');
    check(await background.evaluate(video => video.paused),'An already playing background demo stops on modal open');
    await page.keyboard.press('Escape'); await closed();
    await pointerClick(page.locator('[data-motion-toggle]'));
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'off');
    const open = await opener('icm-buddy',page,true); await pointerClick(open);
    const dialog = await activeModal('icm-buddy');
    const video = dialog.locator('video');
    await video.scrollIntoViewIfNeeded(); await frames(page,3);
    check(await video.evaluate(video => video.controls && video.paused),'Motion-paused dialog video retains native controls without autoplay');
    await video.evaluate(video => video.play());
    await page.waitForFunction(() => { const video=document.querySelector('dialog[open] video'); return !video.paused && video.currentTime > .05; });
    check(await video.evaluate(video => !video.paused),'Manual play works inside a motion-paused project dialog');
    await video.evaluate(video => video.pause());
    await dialog.locator('.dialog-project-nav').scrollIntoViewIfNeeded(); await video.scrollIntoViewIfNeeded(); await frames(page,4);
    check(await video.evaluate(video => video.paused),'Manual pause survives modal scrolling');
    await page.keyboard.press('Escape'); await closed();
    await pointerClick(page.locator('[data-motion-toggle]'));
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'on');
    await page.locator('#contact').scrollIntoViewIfNeeded(); await frames(page,3);
    const offscreen = await steadyDraws();
    check(offscreen.before === offscreen.after,'Workbench draw loop stops when its chapter is offscreen',offscreen);
    check(await page.locator('main > section video').evaluateAll(videos => videos.every(video => video.paused)),'Offscreen background videos stop');
  });
  await group('Motion toggles preserve visible content and horizontal pane',async () => {
    await home();
    for(const key of ['career','writing','experiments']) {
      await chapter(key,.55);
      const pin = page.locator('[data-scroll-chapter="'+key+'"] .chapter-pin');
      const before = await pin.evaluate(element => element.getBoundingClientRect().top);
      const progressBefore = Number(await page.locator('[data-scroll-chapter="'+key+'"]').getAttribute('data-progress'));
      await pointerClick(page.locator('[data-motion-toggle]'));
      await page.waitForFunction(() => document.documentElement.dataset.motion === 'off' && document.documentElement.dataset.cinematic === 'off'); await frames(page,3);
      const paused = await pin.evaluate(element => element.getBoundingClientRect().top);
      check(Math.abs(paused-before) < 3,'Pausing motion preserves viewed '+key+' content position',{before,paused});
      await pointerClick(page.locator('[data-motion-toggle]'));
      await page.waitForFunction(() => document.documentElement.dataset.motion === 'on' && document.documentElement.dataset.cinematic === 'on'); await frames(page,3);
      const resumed = await pin.evaluate(element => element.getBoundingClientRect().top);
      check(Math.abs(resumed-paused) < 3,'Enabling motion preserves viewed '+key+' content position',{paused,resumed});
      const progressAfter = Number(await page.locator('[data-scroll-chapter="'+key+'"]').getAttribute('data-progress'));
      check(Math.abs(progressAfter-progressBefore) < .025,'Resuming motion preserves '+key+' chapter progress',{before:progressBefore,after:progressAfter});
    }
    await jump('classility');
    const stage = page.locator('[data-project-stage="classility"]');
    const before = await stage.evaluate(element => element.getBoundingClientRect().top);
    await pointerClick(page.locator('[data-motion-toggle]')); await page.waitForFunction(() => document.documentElement.dataset.cinematic === 'off'); await frames(page,3);
    const paused = await stage.evaluate(element => ({top:element.getBoundingClientRect().top,active:element.dataset.active}));
    await pointerClick(page.locator('[data-motion-toggle]')); await page.waitForFunction(() => document.documentElement.dataset.cinematic === 'on'); await frames(page,3);
    const resumed = await stage.evaluate(element => ({top:element.getBoundingClientRect().top,left:element.getBoundingClientRect().left,active:element.dataset.active}));
    check(paused.active === 'true' && resumed.active === 'true' && Math.abs(paused.top-before) < 3 && Math.abs(resumed.top-before) < 3 && Math.abs(resumed.left) < 2,'Off/on preserves the current horizontal project pane and its position',{before,paused,resumed});
    await pointerClick(page.locator('[data-motion-toggle]')); await page.waitForFunction(() => document.documentElement.dataset.motion === 'off');
    await page.reload({waitUntil:'domcontentloaded'}); await page.waitForSelector('html[data-experience-ready="true"]',{state:'attached'});
    check(await page.locator('html').getAttribute('data-motion') === 'off','Explicit paused-motion preference persists after reload');
    await pointerClick(page.locator('[data-motion-toggle]')); await page.waitForFunction(() => document.documentElement.dataset.motion === 'on');
  });
  await group('Homepage and project-dialog accessibility',async () => {
    await home(); await axe('Homepage');
    for(const slug of ['icm-buddy','nizam']) {
      const link = await opener(slug); await pointerClick(link); await activeModal(slug);
      await axe('Open '+slug+' dialog');
      if(slug === 'icm-buddy') await screenshot('desktop-dialog');
      await page.keyboard.press('Escape'); await closed();
    }
  });

  await group('Responsive layout, short desktop and mobile menu',async () => {
    for(const [width,height] of [[320,640],[390,844],[768,1024],[1024,768],[1440,650]]) {
      await page.setViewportSize({width,height}); await home();
      const dimensions = await overflow();
      check(dimensions.scroll <= width+1 && dimensions.body <= width+1,'No horizontal overflow at '+width+' × '+height,dimensions);
      if(width < 1024 || height < 700) {
        const pins = await page.locator('[data-scroll-chapter] .chapter-pin').evaluateAll(elements => elements.map(element => getComputedStyle(element).position));
        check(await page.locator('html').getAttribute('data-cinematic') === 'off' && pins.every(position => position !== 'sticky'),'Constrained viewport disables all pinned chapters at '+width+' × '+height,pins);
      }
      if(width <= 390) {
        await screenshot('mobile-'+width+'-hero');
        await page.locator('#writing').scrollIntoViewIfNeeded(); await screenshot('mobile-'+width+'-writing');
        check((await overflow()).scroll <= width+1,'Decoded book covers fit at '+width+'px');
        const header = page.locator('.site-header');
        const initial = await header.evaluate(element => element.getBoundingClientRect().height);
        await pointerClick(page.locator('.menu-toggle')); await page.waitForSelector('.site-nav.is-open');
        const expanded = await header.evaluate(element => element.getBoundingClientRect().height);
        check(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'true' && expanded > initial+20,'Mobile menu expands usable navigation at '+width+'px');
        await page.keyboard.press('Escape'); await frames(page,3);
        const collapsed = await header.evaluate(element => element.getBoundingClientRect().height);
        check(await page.locator('.menu-toggle').getAttribute('aria-expanded') === 'false' && Math.abs(collapsed-initial) < 1 && await page.evaluate(() => document.activeElement.classList.contains('menu-toggle')),'Escape closes menu, restores focus and shrinks header at '+width+'px',{initial,expanded,collapsed});
        const link = await opener('icm-buddy',page,true); await pointerClick(link); await activeModal('icm-buddy');
        check((await overflow()).scroll <= width+1 && await page.locator('dialog[open]').evaluate(element => element.getBoundingClientRect().width <= innerWidth+1),'Project dialog fits the narrow viewport at '+width+'px');
        await page.keyboard.press('Escape'); await closed();
      }
    }
    await page.setViewportSize(size);
  });
  await group('Coarse pointer, reduced motion and JavaScript-free fallbacks',async () => {
    const touch = await newPage({hasTouch:true,isMobile:true,viewport:size});
    await home(touch.page);
    check(await touch.page.evaluate(() => matchMedia('(pointer:coarse)').matches),'Touch scenario actually uses a coarse pointer');
    check(await touch.page.locator('html').getAttribute('data-cinematic') === 'off' && await touch.page.locator('.hero').evaluate(element => getComputedStyle(element).position !== 'sticky'),'A wide touch viewport still uses unpinned chapters');
    await closeContext(touch.context);
    const reduced = await newPage({reducedMotion:'reduce'});
    await home(reduced.page);
    check(await reduced.page.locator('html').getAttribute('data-motion') === 'off' && await reduced.page.locator('html').getAttribute('data-cinematic') === 'off','OS reduced motion disables cinematic pinning');
    await reduced.page.locator('[data-project-stage="icm-buddy"] video').scrollIntoViewIfNeeded(); await frames(reduced.page,4);
    check(await reduced.page.locator('main > section video').evaluateAll(videos => videos.every(video => video.paused)),'Reduced motion suppresses decorative video autoplay');
    await reduced.page.locator('[data-workbench-select="book"]').click();
    check(await reduced.page.locator('[data-workbench-select="book"]').getAttribute('aria-pressed') === 'true','Reduced motion retains direct world controls');
    await reduced.page.evaluate(() => scrollBy({top:100,behavior:'instant'})); await frames(reduced.page,3);
    check(await reduced.page.locator('[data-workbench-select="book"]').getAttribute('aria-pressed') === 'true','Scrolling a static presentation preserves the manually chosen world');
    await closeContext(reduced.context);
    const noJS = await newPage({javaScriptEnabled:false});
    await noJS.page.goto(base+'/',{waitUntil:'load'});
    check(await noJS.page.locator('h1').isVisible() && await noJS.page.locator('[data-project-stage]').count() === 6 && await noJS.page.locator('.experiment-tile').count() === 6 && await noJS.page.locator('.book-card').count() === 3,'Full introduction, stories, experiments and writing exist without JavaScript');
    check(await noJS.page.locator('.workbench-fallback').isVisible() && await noJS.page.locator('html').getAttribute('data-cinematic') === 'off' && await noJS.page.locator('.chapter-pin').evaluateAll(elements => elements.every(element => getComputedStyle(element).position !== 'sticky')),'JavaScript-free site uses a visible poster and unpinned content');
    await noJS.page.locator('[data-project-stage="icm-buddy"] .project-actions [data-project-open]').click();
    check(new URL(noJS.page.url()).pathname === '/work/icm-buddy/' && await noJS.page.locator('h1').count() === 1 && await noJS.page.locator('.case-section').count() >= 3,'Ordinary project link opens complete fallback detail without JavaScript');
    await closeContext(noJS.context);
  });
  await group('Capability checks avoid heavy scene downloads',async () => {
    for(const mode of ['no-webgl','save-data']) {
      const init = mode === 'no-webgl' ? () => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type,...args) { return String(type).startsWith('webgl') ? null : original.call(this,type,...args); };
      } : () => { Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}); };
      const fallback = await newPage({},init);
      const requests = [];
      fallback.page.on('request',request => requests.push(request.url()));
      await home(fallback.page); await fallback.page.waitForSelector('[data-scene-status="fallback"]'); await frames(fallback.page,4);
      await fallback.page.waitForFunction(() => { const image=document.querySelector('.workbench-fallback'); return image.complete && image.naturalWidth > 0; });
      check(await fallback.page.locator('.workbench-fallback').evaluate(image => getComputedStyle(image).opacity === '1' && image.complete && image.naturalWidth > 0) && await fallback.page.locator('.workbench-canvas canvas').count() === 0,'Capability fallback keeps the loaded visible poster: '+mode);
      const heavy = requests.filter(url => heavyChunk(url) || sceneRequests.has(url));
      check(!heavy.length,'Capability check skips the heavy WebGL chunk: '+mode,heavy);
      if(mode === 'save-data') {
        await fallback.page.locator('[data-project-stage="icm-buddy"] video').scrollIntoViewIfNeeded(); await frames(fallback.page,4);
        check(await fallback.page.locator('main > section video').evaluateAll(videos => videos.every(video => video.paused)),'Save Data prevents decorative video autoplay');
      }
      await closeContext(fallback.context);
    }
  });
  await group('Standalone project routes retain complete content on refresh',async () => {
    await page.setViewportSize(size);
    for(const slug of cases) {
      const response = await page.goto(base+'/work/'+slug+'/',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('html[data-experience-ready="true"]',{state:'attached'});
      check(response.status() === 200 && await page.locator('h1').count() === 1 && await page.locator('.case-section').count() >= 3,'Standalone detail includes the full project story: '+slug);
      await page.reload({waitUntil:'domcontentloaded'});
      check(await page.locator('.detail-overview').count() === 1 && await page.locator('.detail-logo').getAttribute('src') === '/showcase-assets/logos/'+slug+'.svg','Standalone refresh retains contribution, outcome and identity: '+slug);
      const media = await page.locator('.case-media img,.case-media source').evaluateAll(elements => elements.map(element => element.getAttribute('src')));
      for(const path of media) check((await context.request.head(base+path)).status() === 200,'Standalone media resolves: '+slug+' / '+path);
    }
  });
  if(portfolioOnly) report.skipped.push('Reader and legacy standalone routes: QA_SCOPE=portfolio');
  else await group('Preserved reader search, theme, settings and legacy routes',async () => {
    await page.setViewportSize(size);
    const response = await page.goto(base+'/novel/',{waitUntil:'networkidle'});
    check(response.status() === 200,'Novel library is present in the assembled preview');
    const search = page.getByRole('searchbox',{name:'Search novels'});
    await search.fill('Second Skin');
    await page.waitForFunction(() => [...document.querySelectorAll('a')].some(link => link.textContent.includes('Second Skin')));
    check(await page.getByRole('link',{name:/Second Skin/}).count() > 0,'Novel search finds Second Skin');
    await search.fill('No such novel 6e12e0');
    await page.waitForFunction(() => ![...document.querySelectorAll('a')].some(link => link.textContent.includes('Second Skin')));
    check(await page.getByRole('link',{name:/Second Skin/}).count() === 0,'Novel search excludes nonmatching titles');
    await search.fill('');
    const theme = await page.locator('html').getAttribute('data-theme');
    await page.getByRole('button',{name:/Switch to .* mode/}).click();
    const changed = await page.locator('html').getAttribute('data-theme');
    check(changed !== theme,'Reader theme toggles');
    await page.reload({waitUntil:'networkidle'});
    check(await page.locator('html').getAttribute('data-theme') === changed,'Reader theme persists after refresh');
    await page.goto(base+'/novel/second-skin/Chapter1/',{waitUntil:'networkidle'});
    check(await page.locator('.prose-reader').count() === 1,'A real novel chapter renders');
    await page.getByRole('button',{name:'Reader settings',exact:true}).click();
    check(await page.getByRole('dialog',{name:'Reader settings'}).isVisible(),'Reader settings remain available');
    await page.getByRole('combobox',{name:'Font family'}).selectOption('source');
    await page.getByRole('button',{name:'Close settings'}).click();
    await page.reload({waitUntil:'domcontentloaded'});
    check(await page.evaluate(() => JSON.parse(localStorage.getItem('reader-prefs') || '{}').fontId === 'source' && document.documentElement.style.getPropertyValue('--reader-font').includes('Source Serif')),'Reader font preference persists and applies after refresh');
    check(await page.locator('html').getAttribute('data-theme') === changed,'Reader theme carries from library to chapter');
    for(const path of ['/novel/second-skin/Chapter15/','/novel/as-if-you-never-left/EpilogueA/','/novel/as-if-you-never-left/EpilogueB/','/foryou.html','/hny.html','/vday.html']) {
      const response = await context.request.get(base+path);
      check(response.status() === 200,'Preserved chapter, epilogue or standalone page resolves: '+path);
    }
  });
  check(!report.pageErrors.length,'No portfolio, dialog or reader JavaScript errors',report.pageErrors);
} catch(error) { check(false,'QA setup or ungrouped failure: '+error.message); }
finally {
  for(const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
  const summary = { url:base,scope:report.scope,passed:report.checks.filter(item => item.pass).length,failed:report.checks.filter(item => !item.pass).length,groups:report.groups.length,skipped:report.skipped,failures:report.failures,accessibility:report.accessibility,measurements:report.measurements,screenshots:report.screenshots };
  const suffix = groupFilter.length ? '-targeted':'';
  await writeFile(resolve(output,'report'+suffix+'.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(resolve(output,'summary'+suffix+'.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));
  if(report.failures.length) process.exitCode=1;
}
