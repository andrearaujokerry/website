// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// Pages that never belong in search results.
const unlisted = ['/styleguide/', '/404/'];

// https://astro.build/config
export default defineConfig({
  site: 'https://andrearaujokerry.com',
  integrations: [
    sitemap({ filter: (page) => !unlisted.some((path) => new URL(page).pathname === path) }),
  ],
  // Downloaded at build time and self-hosted, with metric-matched fallbacks.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Instrument Serif',
      cssVariable: '--font-serif',
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Instrument Sans',
      cssVariable: '--font-sans',
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
