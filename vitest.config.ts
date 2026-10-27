/// <reference types="vitest/config" />
// Tests (README.md, "Tests"), in two Vitest projects:
// - unit: helpers, content rules, components and the Worker, straight from the source.
// - site: the built site in dist/, in Chrome. Run `npm run build` first.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    projects: [
      {
        // Inherits Astro's Vite setup, so components and `astro:*` imports work.
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          // Behind UTC, so a date shown in local time instead of UTC fails here, even on CI (UTC).
          env: { TZ: 'America/Los_Angeles' },
        },
      },
      {
        test: {
          name: 'site',
          include: ['tests/site/**/*.test.ts'],
          // Each file drives Chrome; running them one at a time keeps timings steady.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
