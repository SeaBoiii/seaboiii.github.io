import { chromium } from 'playwright';
import sharp from 'sharp';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.SCENE_URL || 'http://127.0.0.1:4326';
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.evaluate(() => {
    document.body.innerHTML = '<div class="share-card"><div><p class="share-role">Product Development Engineer at AMD</p><h1>Aleem<br>Siddique</h1><p class="share-description">Engineering, experiments & stories.</p><p class="share-site">seaboiii.github.io</p></div><img src="/showcase-assets/media/workbench-poster.webp" alt=""></div>';
  });
  await page.addStyleTag({content:'html,body{width:1200px;height:630px;overflow:hidden;margin:0;background:#030405;color:#edf3f8}.share-card{padding:65px;display:grid;grid-template-columns:1fr 1.2fr;align-items:center;gap:15px;height:100%;isolation:isolate}.share-card>div{position:relative;z-index:2}.share-role{font-size:16px;color:#96b3c9;margin-bottom:27px}.share-card h1{font-size:85px;line-height:1.02;letter-spacing:-.06em}.share-description{font-size:23px;margin-top:28px}.share-site{font-size:14px;color:#8393a3;margin-top:38px}.share-card img{position:absolute;inset:0;z-index:-1;width:1200px;height:630px;object-fit:cover;background:#030405}'});
  await page.evaluate(() => Promise.all([document.fonts.ready,...[...document.images].map(image => image.decode())]));
  await sharp(await page.screenshot()).jpeg({quality:88}).toFile(resolve(root,'public/showcase-assets/media/social-card.jpg'));
  console.log('Social card exported from the real portfolio typography and scene.');
} finally {await browser.close();}
