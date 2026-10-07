/** Reproducible, authentic user-flow recordings. No simulated project screenshots. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const media = path.join(base, 'public/showcase-assets/media');
const raw = path.join(base, 'qa/media-raw');
await fs.mkdir(raw, { recursive: true });
const browser = await chromium.launch({ headless: true });
const encode = (args) => new Promise((resolve, reject) => {
  const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; proc.stderr.on('data', (c) => { stderr += c; });
  proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr)));
});
async function record(name, url, action) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: raw, size: { width: 1280, height: 800 } } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const start = Date.now();
  await action(page);
  const video = page.video();
  await context.close();
  const source = await video.path();
  for (const format of ['mp4', 'webm']) {
    const codec = format === 'mp4' ? ['-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] : ['-c:v', 'libvpx-vp9', '-crf', '35', '-b:v', '0', '-cpu-used', '4', '-row-mt', '1'];
    await encode(['-y', '-ss', '1', '-i', source, '-an', '-vf', 'fps=24', ...codec, path.join(media, `${name}-demo.${format}`)]);
  }
  console.log(JSON.stringify({ name, source: url, duration_ms: Date.now() - start, files: [`${name}-demo.mp4`, `${name}-demo.webm`] }));
}
async function poster(page, name) {
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 86 }).toFile(path.join(media, `${name}.webp`));
}
try {
  const names = process.argv.slice(2);
  if (!names.length || names.includes('classility')) await record('classility', 'https://seaboiii.github.io/classility/', async (page) => {
    await poster(page, 'classility');
    await page.waitForTimeout(1800);
    await page.getByRole('button').first().click();
    await page.waitForTimeout(1100);
    for (let i = 0; i < 20; i++) {
      const options = page.getByRole('button').filter({ hasNotText: /^Back$/i });
      await options.nth([2, 1, 2, 0][i % 4]).click();
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(4500);
    console.log((await page.locator('body').innerText()).slice(0, 300));
  });
  if (!names.length || names.includes('rover')) await record('rover', 'https://seaboiii.github.io/amd_robotics/', async (page) => {
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /start new mission/i }).click();
    await page.getByPlaceholder('e.g. Circuit Breakers').pressSequentially('Curiosity Crew', { delay: 70 });
    await page.getByRole('button', { name: /create team and enter/i }).click();
    await page.waitForTimeout(1300);
    await page.getByRole('button', { name: /first movement/i }).click();
    await page.getByRole('button', { name: /understood/i }).click();
    await page.waitForTimeout(1400);
    await poster(page, 'rover');
    await page.getByRole('button', { name: /edit program/i }).click();
    await page.waitForTimeout(1500);
    await page.getByRole('spinbutton', { name: /speed percent/i }).fill('55');
    await page.waitForTimeout(1600);
    await page.getByRole('button', { name: /run in simulator/i }).click();
    await page.getByRole('button', { name: /understood/i }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /understood/i }).click();
    await page.getByRole('button', { name: /^▶ Run$/ }).click();
    await page.waitForTimeout(9000);
    const pause = page.getByRole('button', { name: /pause/i });
    if (await pause.count()) await pause.click();
    await page.waitForTimeout(1500);
  });
  if (!names.length || names.includes('tiny-ai')) await record('tiny-ai', process.env.TINY_AI_CAPTURE_URL || 'http://127.0.0.1:4188', async (page) => {
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /start training/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /color mixer lab/i }).click();
    await page.waitForTimeout(1100);
    const colors = [['Reds', [255, 0, 0]], ['Greens', [0, 255, 0]], ['Blues', [0, 0, 255]], ['Yellows', [255, 255, 0]]];
    for (const [label, values] of colors) {
      await page.getByRole('radio', { name: new RegExp(label) }).click();
      const sliders = page.getByRole('slider');
      for (let sample = 0; sample < 2; sample++) {
        // The original application resets sliders after each example.
        for (let j = 0; j < 3; j++) await sliders.nth(j).press(values[j] === 255 ? 'End' : 'Home');
        if (sample) await sliders.nth(values[0] === 255 ? 0 : values[1] === 255 ? 1 : 2).press('ArrowLeft');
        await page.waitForTimeout(400);
        await page.getByRole('button', { name: /add example/i }).click();
        await page.waitForTimeout(300);
      }
    }
    await poster(page, 'tiny-ai');
    await page.getByRole('button', { name: /train tiny ai/i }).click();
    await page.getByRole('heading', { name: /test your tiny ai/i }).waitFor();
    await page.waitForTimeout(500);
    console.log(JSON.stringify({ tiny_test_buttons: await page.getByRole('button').allTextContents() }));
    const sliders = page.getByRole('slider');
    for (let j = 0; j < 3; j++) await sliders.nth(j).press(j === 2 ? 'End' : 'Home');
    const predict = page.getByRole('button', { name: /ask the ai/i });
    await predict.first().click();
    await page.waitForTimeout(3500);
    await poster(page, 'tiny-ai');
  });
} finally { await browser.close(); }
