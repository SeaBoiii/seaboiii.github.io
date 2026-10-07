/** Export the real, procedural website scene. No generative service or credential required. */
import { chromium } from 'playwright';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { mkdir, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'public/showcase-assets/media');
const frames = resolve(root, 'qa/artifacts/workbench-frames');
const url = process.env.SCENE_URL || 'http://127.0.0.1:4326';
const count = 192;
await mkdir(frames, { recursive: true });
await access(ffmpeg);
if (!process.argv.includes('--encode-only')) {
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__workbenchCapture?.canvas && document.querySelector('[data-scene-status="ready"]'), { timeout: 30_000 });
  await page.addStyleTag({ content: '.hero-copy,.hero-base,.site-header,.chapter-meter,astro-dev-toolbar{visibility:hidden!important}.workbench-stage{position:relative!important;width:1600px!important;height:1000px!important;inset:auto!important;background:#030405!important;mask-image:none!important}.hero{padding:0!important;display:block!important}' });
  await page.waitForTimeout(250);
  for (let frame = 0; frame < count; frame++) {
    // Begin and end assembled; advance smoothly through all three worlds.
    const progress = Math.sin(Math.PI * frame / (count - 1)) ** 2;
    await page.evaluate(progress => window.__workbenchCapture.setProgressAsync(progress), progress);
    await page.locator('.workbench-stage').screenshot({ path: resolve(frames, `${String(frame).padStart(4, '0')}.png`) });
    if (frame % 48 === 0) console.log(`Captured ${frame}/${count} frames`);
  }
  await sharp(await readFile(resolve(frames, '0000.png'))).webp({ quality: 90 }).toFile(resolve(output, 'workbench-poster.webp'));
  await page.setViewportSize({ width: 780, height: 860 });
  await page.addStyleTag({ content: '.workbench-stage{width:780px!important;height:860px!important}' });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__workbenchCapture.setProgressAsync(0));
  await sharp(await page.locator('.workbench-stage').screenshot()).webp({ quality: 90 }).toFile(resolve(output, 'workbench-poster-mobile.webp'));
  await page.evaluate(() => window.__workbenchCapture.reset());
} finally { await browser.close(); }
}
const encode = args => new Promise((resolveResult, reject) => {
  const process = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
  let error = ''; process.stderr.on('data', chunk => { error += chunk; });
  process.on('error', reject); process.on('exit', code => code === 0 ? resolveResult() : reject(new Error(error)));
});
const input = ['-framerate','24','-i',resolve(frames,'%04d.png'),'-an','-vf','scale=1280:800'];
await encode([...input,'-c:v','libx264','-crf','22','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',resolve(output,'workbench-render.mp4')]);
await encode([...input,'-c:v','libvpx-vp9','-crf','37','-b:v','1200k','-cpu-used','4','-row-mt','1',resolve(output,'workbench-render.webm')]);
console.log('Exported real workbench video and matching poster.');
