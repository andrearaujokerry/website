// Accessibility: axe-core on every built page, in both themes, at desktop and phone sizes.
// Any violation fails. Run `npm run build` first, then `npm run test:a11y`.
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { after, before, describe, test } from 'node:test';
import puppeteer from 'puppeteer-core';
import { chromeArgs, chromePath, dist, serveDist } from '../scripts/lib/serve-dist.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

// WCAG 2.0–2.2, levels A and AA, plus axe's best practices.
const axeOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};

const viewports = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

// Every HTML page in dist/, as URL paths: "/", "/about/", "/404.html", …
const pages = (await readdir(dist, { recursive: true }))
  .filter((file) => file.endsWith('.html'))
  .map((file) => `/${file.replace(/index\.html$/, '')}`)
  .sort();

const describeViolation = (v) =>
  `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((node) => node.target.join(' ')).join('\n    ')}`;

let server;
let browser;

before(async () => {
  server = await serveDist();
  browser = await puppeteer.launch({ executablePath: chromePath, args: chromeArgs });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

test('the build has pages to check', () => {
  assert.ok(pages.length > 0, 'No pages in dist/. Run `npm run build` first.');
});

for (const [viewportName, viewport] of Object.entries(viewports)) {
  for (const theme of ['light', 'dark']) {
    describe(`${viewportName}, ${theme} theme`, () => {
      for (const path of pages) {
        test(path, async () => {
          const page = await browser.newPage();
          try {
            await page.setViewport(viewport);
            await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
            await page.goto(server.url + path, { waitUntil: 'networkidle0' });
            await page.addScriptTag({ path: axePath });
            // Evaluated in the page, where `axe` and `document` exist.
            const { violations } = await page.evaluate(
              `axe.run(document, ${JSON.stringify(axeOptions)})`,
            );
            assert.equal(violations.length, 0, violations.map(describeViolation).join('\n'));
          } finally {
            await page.close();
          }
        });
      }
    });
  }
}
