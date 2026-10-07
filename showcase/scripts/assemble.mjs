import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appRoot, '..');
const output = resolve(appRoot, 'site-dist');
// The only removable path is this application's dedicated, ignored build output.
if (output !== join(appRoot, 'site-dist') || !output.startsWith(appRoot + (process.platform === 'win32' ? '\\' : '/'))) throw new Error('Unsafe assembly destination');
for (const path of [join(repoRoot, 'web/out/index.html'), join(appRoot, 'dist/index.html')]) {
  try { await access(path); } catch { throw new Error(`Build both applications before assembling: missing ${path}`); }
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['tetris', 'wordle', 'images', 'img', 'css', 'js', 'assets']) {
  const source = join(repoRoot, name);
  try { await access(source); } catch { continue; }
  await cp(source, join(output, name), { recursive: true, filter: sourcePath => !/(?:^|[\\/])(?:node_modules|\.git)(?:[\\/]|$)/.test(sourcePath) });
}
for (const name of ['foryou.html', 'hny.html', 'vday.html', 'site.webmanifest', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png']) {
  try { await cp(join(repoRoot, name), join(output, name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
await cp(join(repoRoot, 'web/out'), output, { recursive: true });
await cp(join(appRoot, 'dist'), output, { recursive: true });
await writeFile(join(output, '.nojekyll'), '');
console.log('Combined portfolio and novel reader assembled in showcase/site-dist.');
