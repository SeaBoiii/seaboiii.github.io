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
const url = process.env.SCENE_URL || 'http://127.0.0.1:4322';
const count = 192;
await mkdir(frames, { recursive: true });
await access(ffmpeg);
if (!process.argv.includes('--encode-only')) {
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2200, height: 1100 }, deviceScaleFactor: 1 });
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__workbenchCapture?.canvas && document.querySelector('[data-scene-status="ready"]'), { timeout: 30_000 });
  await page.evaluate(() => {
    const stage = document.querySelector('.workbench-stage');
    stage.style.width = '960px'; stage.style.height = '540px'; stage.style.borderRadius = '0';
    document.querySelector('.stage-note').style.visibility = 'hidden';
  });
  await page.waitForTimeout(250);
  for (let frame = 0; frame < count; frame++) {
    const progress = Math.sin(Math.PI * frame / count) ** 2;
    await page.evaluate(progress => window.__workbenchCapture.setProgressAsync(progress), progress);
    await page.locator('.workbench-stage').screenshot({ path: resolve(frames, `${String(frame).padStart(4, '0')}.png`) });
    if (frame % 48 === 0) console.log(`Captured ${frame}/${count} frames`);
  }
  await sharp(await readFile(resolve(frames, '0000.png'))).webp({ quality: 90 }).toFile(resolve(output, 'workbench-poster.webp'));
  await page.evaluate(() => window.__workbenchCapture.reset());
} finally { await browser.close(); }
}
const encode = args => new Promise((resolveResult, reject) => {
  const process = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { windowsHide: true, stdio: ['ignore','ignore','pipe'] });
  let error = ''; process.stderr.on('data', chunk => { error += chunk; });
  process.on('error', reject); process.on('exit', code => code === 0 ? resolveResult() : reject(new Error(error)));
});
const input = ['-framerate','24','-i',resolve(frames,'%04d.png'),'-an','-vf','scale=960:540'];
await encode([...input,'-c:v','libx264','-crf','22','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',resolve(output,'workbench-render.mp4')]);
await encode([...input,'-c:v','libvpx-vp9','-crf','33','-b:v','0','-cpu-used','4','-row-mt','1',resolve(output,'workbench-render.webm')]);
console.log('Exported real workbench video and matching poster.');
