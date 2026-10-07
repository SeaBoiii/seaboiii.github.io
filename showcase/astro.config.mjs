import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://seaboiii.github.io',
  base: '/',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react()],
  vite: { build: { sourcemap: false } },
});
