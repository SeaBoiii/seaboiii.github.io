import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { stat, readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const legacy = process.argv.includes('--legacy');
const root = resolve(dirname(fileURLToPath(import.meta.url)), legacy ? '../..' : '../site-dist');
const normalizedRoot = root.replaceAll('\\', '/');
const previewId = createHash('sha256').update(process.platform === 'win32' ? normalizedRoot.toLowerCase() : normalizedRoot).digest('hex').slice(0, 16);
const requestedPort = process.argv.find(argument => argument.startsWith('--port='))?.slice(7);
const port = Number(requestedPort || process.env.PORT || (legacy ? 4180 : 4174));
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.txt':'text/plain; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.gif':'image/gif', '.ico':'image/x-icon', '.woff2':'font/woff2', '.mp4':'video/mp4', '.webm':'video/webm' };
createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); } catch { response.writeHead(400).end(); return; }
  let file = resolve(root, '.' + pathname);
  if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = resolve(file, 'index.html');
    const bytes = await readFile(file);
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const headers = { 'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache', 'X-Portfolio-Preview':previewId };
    if (range) {
      const start = Number(range[1]); const end = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
      if (start >= bytes.length || end < start) { response.writeHead(416, { 'Content-Range':`bytes */${bytes.length}` }).end(); return; }
      response.writeHead(206, { ...headers, 'Content-Range':`bytes ${start}-${end}/${bytes.length}`, 'Content-Length':end-start+1 });
      response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start,end+1));
    } else { response.writeHead(200,{ ...headers,'Content-Length':bytes.length }); response.end(request.method === 'HEAD' ? undefined : bytes); }
  } catch {
    response.writeHead(404, { 'Content-Type':'text/html; charset=utf-8' });
    try { response.end(await readFile(resolve(root,'404.html'))); } catch { response.end('Page not found'); }
  }
}).listen(port, '127.0.0.1', () => console.log(`${legacy ? 'Original portfolio' : 'Combined site'} preview: http://127.0.0.1:${port}`));
