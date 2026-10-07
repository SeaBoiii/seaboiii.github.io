/** Retrieve the owner's public demo source only for offline media capture. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../qa/tiny-source');
const headers = { 'User-Agent': 'aleem-fieldbook-media' };
const endpoint = 'https://api.github.com/repos/SeaBoiii/amd_trainatinyai/git/trees/main?recursive=1';
const tree = await (await fetch(endpoint, { headers })).json();
const rootFiles = ['package.json', 'package-lock.json', 'index.html', 'postcss.config.js', 'tailwind.config.js', 'tsconfig.app.json', 'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts'];
const selected = tree.tree.filter((f) => f.type === 'blob' && (rootFiles.includes(f.path) || f.path.startsWith('src/') || f.path.startsWith('public/models/') || ['public/ort/ort-wasm-simd-threaded.mjs', 'public/ort/ort-wasm-simd-threaded.wasm'].includes(f.path)));
for (let i = 0; i < selected.length; i += 5) {
  await Promise.all(selected.slice(i, i + 5).map(async (f) => {
    const data = await fetch(`https://raw.githubusercontent.com/SeaBoiii/amd_trainatinyai/${tree.sha}/${f.path}`);
    if (!data.ok) throw new Error(`Source retrieval failed for ${f.path}`);
    const target = path.join(output, f.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(await data.arrayBuffer()));
  }));
}
await fs.writeFile(path.join(output, 'CAPTURE_SOURCE.json'), JSON.stringify({ repo: 'SeaBoiii/amd_trainatinyai', commit: tree.sha, date: '2026-10-07', files: selected.map((f) => f.path) }, null, 2));
console.log(JSON.stringify({ files: selected.length, commit: tree.sha }));
