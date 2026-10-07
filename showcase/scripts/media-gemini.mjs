/** Offline only. Never import this file into the website. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(dir, 'public/showcase-assets/media');
const model = 'gemini-omni-1.1-flash';
const args = process.argv.slice(2);
const keyFile = args[args.indexOf('--key-file') + 1];
if (!args.includes('--key-file') || !keyFile) throw new Error('Supply --key-file with a local credential path.');
const key = (await fs.readFile(keyFile, 'utf8')).replace(/^\uFEFF/, '').trim();
if (!key) throw new Error('Credential file is empty.');
const request = async (endpoint, body) => {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-goog-api-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(body ? 600_000 : 30_000),
  });
  let data;
  try { data = await r.json(); } catch { data = {}; }
  if (!r.ok) {
    // Do not print remote payloads, headers, keys, request URLs, or source text.
    const error = new Error(`Gemini request failed (HTTP ${r.status}, ${data.error?.status || 'unknown'}).`);
    error.status = r.status;
    throw error;
  }
  return data;
};

async function main() { try {
  const list = await request('models');
  const omni = (list.models || []).filter((m) => m.name.includes('omni')).map((m) => m.name);
  console.log(JSON.stringify({ auth_status: 200, omni_models: omni }));
  if (!args.includes('--generate')) return;
  // Explicitly one generation per invocation; no retry or model substitution.
  // 8s at 720p ~46,336 video tokens. ~$0.811 video output plus input/thinking.
  // This run reserves US$5, safely below both US$30 total and SGD$28 Gemini limits.
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, 'workbench-film.mp4');
  try { await fs.access(file); throw new Error('Output exists; refusing duplicate generation.'); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const attempt = path.join(dir, 'qa/gemini-attempt.json');
  await fs.writeFile(attempt, JSON.stringify({ model, date: '2026-10-07', reservation_usd: 5, requests: 1, note: 'No automatic retry. Check billing before any intentional subsequent generation.' }, null, 2), { flag: 'wx' });
  const prompt = 'Create an eight-second seamless silent 16:9 loop in a single continuous unbroken scene, no scene cuts. A refined creative engineering workbench on a cool off-white cyclorama (#F7F9FC): three distinct objects arranged in a spacious sculptural still life, a graphite camera lens with finely ribbed focusing ring and blue coated glass, a teal printed circuit module with silver traces and a small blank graphite compute chip, and a slim cobalt-blue clothbound book with cream pages and no text. Realistic materials and beautifully restrained product visualization, soft daylight, subtle shadows, white studio mood. Camera makes one very slow tiny clockwise orbit and returns to its starting position by the end. Objects remain perfectly rigid and still. No people, no hands, no letters, no logos, no interface, no extra objects. No dialogue, no music, no sound effects.';
  const response = await request('interactions', {
    model,
    input: prompt,
    response_format: { type: 'video', aspect_ratio: '16:9', resolution: '720p', duration: '8s', delivery: 'inline' },
    generation_config: { max_output_tokens: 60_000 },
    background: false, store: false, stream: false, service_tier: 'standard',
  });
  const videos = (response.steps || []).flatMap((s) => s.type === 'model_output' ? (s.content || []) : []).filter((c) => c.type === 'video' && c.data);
  if (videos.length !== 1) throw new Error('The generation did not return exactly one inline video. No retry was attempted.');
  await fs.writeFile(file, Buffer.from(videos[0].data, 'base64'));
  const record = { provider: 'Google', model, date: '2026-10-07', prompt, usage: response.usage || response.usage_metadata || null, status: response.status, output: path.basename(file), reservation_usd: 5, estimated_video_usd: 8 * 5792 * 17.5 / 1e6 };
  await fs.writeFile(path.join(dir, 'qa/gemini-usage.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({ status: response.status, output: path.basename(file), usage: record.usage, estimated_video_usd: record.estimated_video_usd }));
} catch (e) {
  console.error(e.message.replaceAll(key, '[REDACTED]'));
  process.exitCode = 1;
} }
await main();
