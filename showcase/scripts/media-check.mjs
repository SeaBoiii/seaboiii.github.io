import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(base, 'public/showcase-assets/media');
async function run(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = ''; proc.stderr.on('data', (c) => { stderr += c; });
    proc.on('error', reject);
    proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}
await fs.mkdir(path.join(base, 'qa'), { recursive: true });
const clips = (await fs.readdir(dir)).filter((f) => /\.(mp4|webm)$/.test(f));
const results = [];
for (const file of clips) {
  await run(['-i', path.join(dir, file), '-f', 'null', '-']);
  results.push({ file, bytes: (await fs.stat(path.join(dir, file))).size, full_decode: 'passed' });
}
await fs.writeFile(path.join(base, 'qa/media-verification.json'), JSON.stringify({ date: '2026-10-07', results }, null, 2) + '\n');
console.log(JSON.stringify(results));
