/** Persist sanitized offline-generation usage; never reads credentials. */
import fs from 'node:fs/promises';
const google = JSON.parse(await fs.readFile(new URL('../qa/gemini-usage.json', import.meta.url), 'utf8'));
const record = {
  date: '2026-10-07',
  authorized_caps: { combined_usd: 30, gemini_sgd: 28 },
  estimated_combined_usd: 0.83,
  conservative_reservations: { combined_usd: 1, gemini_sgd: 2 },
  invoice_note: 'Estimates only. SGD reservation is an allowance, not an exchange-rate conversion. Provider billing is authoritative.',
  providers: [
    { provider: 'OpenAI', model: 'gpt-image-2.5-sunburst-2026-09-08', requests: 1, status: 'authentication_failed', http_status: 401, output_images: 0, estimated_usd: 0, usage: null, note: 'No model substitution or manual retry. Bundled ImageGen CLI used.' },
    { ...google, requests: 1, estimated_total_usd: 0.83, pricing_usd_per_million: { input: 1.5, text_output_including_thinking: 9, video_output: 17.5 }, pricing_source: 'https://ai.google.dev/gemini-api/docs/pricing', no_retry: true },
  ],
};
await fs.writeFile(new URL('./media-usage.json', import.meta.url), JSON.stringify(record, null, 2) + '\n');
console.log('Saved sanitized media-usage.json.');
