import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(base, 'public/showcase-assets/media');
const original = path.join(output, 'workbench-film.mp4');
const encode = (args) => new Promise((resolve, reject) => {
  const proc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; proc.stderr.on('data', (c) => { stderr += c; });
  proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr)));
});
const tmp = path.join(base, 'qa/workbench-film-muted.mp4');
const frame = path.join(base, 'qa/omni-frame.png');
await encode(['-y', '-i', original, '-ss', '1', '-frames:v', '1', frame]);
await encode(['-y', '-i', original, '-an', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp]);
await fs.copyFile(tmp, original);
await encode(['-y', '-i', original, '-an', '-c:v', 'libvpx-vp9', '-crf', '35', '-b:v', '0', path.join(output, 'workbench-film.webm')]);
await sharp(frame).webp({ quality: 85 }).toFile(path.join(output, 'workbench-film-poster.webp'));
// Never overwrite a poster subsequently captured from the actual website scene.
try { await fs.access(path.join(output, 'workbench-poster.webp')); }
catch { await fs.copyFile(path.join(output, 'workbench-film-poster.webp'), path.join(output, 'workbench-poster.webp')); }
console.log('Prepared silent workbench-film.mp4, workbench-film.webm, workbench-film-poster.webp');
