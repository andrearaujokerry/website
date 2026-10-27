// Layout in Chrome: every page from small phones to desktops, touch targets, motion preferences,
// and the printed résumé (which `npm run resume:pdf` turns into public/resume.pdf).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { emulatePreferences, launch, pages, type Visitor } from '../support/site';

let app: Awaited<ReturnType<typeof launch>>;
let you: Visitor;

beforeAll(async () => {
  app = await launch();
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  you = await app.visitor();
});
afterEach(async () => {
  await you.close();
});

describe.each([320, 390, 768, 1280])('at %i px wide', (width) => {
  test.each(pages)('%s never scrolls sideways', async (path) => {
    const page = await you.open(path, { width });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

describe('touch screens', () => {
  test('header controls are at least 44 px tall, easy to tap', async () => {
    const page = await you.open('/', { phone: true });
    await page.click('[data-menu-button]');
    for (const selector of ['[data-menu-button]', '.theme-toggle', 'a.pill']) {
      const { width, height } = await page.$eval(selector, (element) =>
        element.getBoundingClientRect().toJSON(),
      );
      expect(height, selector).toBeGreaterThanOrEqual(44);
      expect(width, selector).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('motion', () => {
  /** How the page scrolls, and how long a button's hover transition takes (in seconds). */
  const motion = () => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    transition: parseFloat(
      getComputedStyle(document.querySelector('a.button')!).transitionDuration,
    ),
  });

  test('scrolling is smooth and buttons animate, unless the visitor asks for less motion', async () => {
    const page = await you.open('/', { reducedMotion: false });
    const full = await page.evaluate(motion);
    expect(full.scroll).toBe('smooth');
    expect(full.transition).toBeGreaterThan(0.05);

    await emulatePreferences(page, 'light', true);
    const reduced = await page.evaluate(motion);
    expect(reduced.scroll).toBe('auto');
    expect(reduced.transition).toBeLessThan(0.001);
  });
});

describe('printed résumé', () => {
  test('fits on one Letter page', async () => {
    const page = await you.open('/resume/');
    const pdf = Buffer.from(await page.pdf({ format: 'Letter', preferCSSPageSize: true }));
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(1);
  });

  test('leaves out the site header, footer and buttons', async () => {
    const page = await you.open('/resume/');
    await page.emulateMediaType('print');
    for (const selector of ['.site-header', '.site-footer', '.skip-link', '.download']) {
      expect(await page.$eval(selector, (element) => element.checkVisibility()), selector).toBe(
        false,
      );
    }
  });

  test('prints black on white, even for a visitor using the dark theme', async () => {
    const page = await you.open('/resume/', { colorScheme: 'dark' });
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
    await page.emulateMediaType('print');
    const colors = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      return { background: body.backgroundColor, text: body.color };
    });
    expect(colors).toEqual({ background: 'rgb(255, 255, 255)', text: 'rgb(17, 17, 17)' });
  });
});
