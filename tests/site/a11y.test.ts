// Accessibility: axe-core on every built page, in both themes, at desktop and phone sizes.
// Any violation fails.
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { launch, pages, type Visitor } from '../support/site';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

// WCAG 2.0–2.2, levels A and AA, plus axe's best practices.
const axeOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
  },
};

interface Violation {
  id: string;
  impact: string;
  help: string;
  nodes: { target: string[] }[];
}

const describeViolation = (v: Violation) =>
  `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((node) => node.target.join(' ')).join('\n    ')}`;

let app: Awaited<ReturnType<typeof launch>>;
let you: Visitor;

beforeAll(async () => {
  app = await launch();
  you = await app.visitor();
});
afterAll(async () => {
  await you?.close();
  await app?.close();
});

describe.each([
  ['desktop', { width: 1280 }],
  ['phone', { phone: true }],
] as const)('%s', (_size, size) => {
  describe.each(['light', 'dark'] as const)('%s theme', (colorScheme) => {
    test.each(pages)('%s', async (path) => {
      const page = await you.open(path, { ...size, colorScheme });
      try {
        await page.addScriptTag({ path: axePath });
        // Evaluated in the page, where `axe` and `document` exist.
        const { violations } = (await page.evaluate(
          `axe.run(document, ${JSON.stringify(axeOptions)})`,
        )) as { violations: Violation[] };
        expect(violations.map(describeViolation)).toEqual([]);
      } finally {
        await page.close();
      }
    });
  });
});
