import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawn } from 'node:child_process';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(base, 'public/showcase-assets/media');
await fs.mkdir(output, { recursive: true });
await sharp(path.join(base, '../img/a1e3m.jpg')).rotate().resize({ width: 750, withoutEnlargement: true }).webp({ quality: 86 }).toFile(path.join(output, 'portrait.webp'));
const encode = (args) => new Promise((resolve, reject) => {
  const command = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = ''; command.stderr.on('data', (c) => { stderr += c; });
  command.on('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr)));
});
const gif = path.join(base, '../img/icm_buddy.gif');
await encode(['-y', '-i', gif, '-an', '-vf', 'scale=960:-2:force_original_aspect_ratio=decrease,fps=24', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(output, 'icm-demo.mp4')]);
await encode(['-y', '-i', gif, '-an', '-vf', 'scale=960:-2:force_original_aspect_ratio=decrease,fps=24', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', path.join(output, 'icm-demo.webm')]);
console.log('Prepared portrait.webp, icm-demo.mp4, icm-demo.webm');
