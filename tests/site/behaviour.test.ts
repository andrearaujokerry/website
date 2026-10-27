// The built site in Chrome: theme, phone menu, email links, keyboard use, jumping to sections,
// and what each page loads. Every test starts with a fresh browser profile (nothing saved).
import type { Page } from 'puppeteer-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { site } from '../../src/site.config';
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

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const toggleState = (page: Page) =>
  page.$eval('.theme-toggle', (button) => button.getAttribute('aria-pressed'));
const savedTheme = (page: Page) => page.evaluate(() => localStorage.getItem('theme'));
const isVisible = (page: Page, selector: string) =>
  page.$eval(selector, (element) => element.checkVisibility());
const focused = (page: Page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    return element
      ? `${element.tagName.toLowerCase()}${element.className ? `.${element.className.split(' ')[0]}` : ''}`
      : '';
  });

describe('theme', () => {
  test.each(['light', 'dark'] as const)('follows a %s OS setting by default', async (scheme) => {
    const page = await you.open('/', { colorScheme: scheme });
    expect(await theme(page)).toBe(scheme);
    expect(await toggleState(page)).toBe(String(scheme === 'dark'));
  });

  test('is set before the page first paints, so the wrong theme never flashes', async () => {
    // Record the theme at the moment <body> is created, before any of it can be drawn.
    const page = await you.open('/', {
      colorScheme: 'dark',
      beforeLoad: () => {
        const observer = new MutationObserver(() => {
          if (!document.body) return;
          (window as unknown as { themeAtBody?: string }).themeAtBody =
            document.documentElement.dataset.theme;
          observer.disconnect();
        });
        observer.observe(document, { childList: true, subtree: true });
      },
    });
    expect(
      await page.evaluate(() => (window as unknown as { themeAtBody?: string }).themeAtBody),
    ).toBe('dark');
  });

  test('the toggle switches it, says so, and remembers the choice on every page', async () => {
    const page = await you.open('/', { colorScheme: 'light' });
    await page.click('.theme-toggle');
    expect(await theme(page)).toBe('dark');
    expect(await toggleState(page)).toBe('true');
    expect(await savedTheme(page)).toBe('dark');

    await page.reload();
    expect(await theme(page)).toBe('dark');
    await page.goto(new URL('/about/', page.url()).href);
    expect(await theme(page)).toBe('dark');

    await page.click('.theme-toggle');
    expect(await theme(page)).toBe('light');
    expect(await savedTheme(page)).toBe('light');
  });

  test('a saved choice wins over the OS setting', async () => {
    const page = await you.open('/', { colorScheme: 'light' });
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await emulatePreferences(page, 'dark');
    await page.reload();
    expect(await theme(page)).toBe('light');
  });

  test('until a choice is made, it follows the OS as it changes', async () => {
    const page = await you.open('/', { colorScheme: 'light' });
    await emulatePreferences(page, 'dark');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    expect(await toggleState(page)).toBe('true');
  });

  test('after a choice, OS changes leave it alone', async () => {
    const page = await you.open('/', { colorScheme: 'light' });
    await page.click('.theme-toggle');
    await emulatePreferences(page, 'light');
    await emulatePreferences(page, 'dark');
    await emulatePreferences(page, 'light');
    expect(await theme(page)).toBe('dark');
  });

  test('still works where storage is blocked (some private modes)', async () => {
    const page = await you.open('/', {
      colorScheme: 'dark',
      beforeLoad: () => {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('Storage is disabled', 'SecurityError');
          },
        });
      },
    });
    expect(await theme(page)).toBe('dark');
    await page.click('.theme-toggle');
    expect(await theme(page)).toBe('light');
    expect(you.problems(page)).toEqual([]);
  });
});

describe('phone menu', () => {
  const state = (page: Page) =>
    page.$eval('[data-menu-button]', (button) => button.getAttribute('aria-expanded'));

  test('the nav starts hidden behind a Menu button', async () => {
    const page = await you.open('/', { phone: true });
    expect(await isVisible(page, '[data-menu-button]')).toBe(true);
    expect(await state(page)).toBe('false');
    expect(await isVisible(page, '#site-nav')).toBe(false);
  });

  test('Menu opens and closes the nav, and announces which', async () => {
    const page = await you.open('/', { phone: true });
    await page.click('[data-menu-button]');
    expect(await state(page)).toBe('true');
    for (const selector of ['#site-nav .links a', '#site-nav .theme-toggle', '#site-nav a.pill']) {
      expect(await isVisible(page, selector), selector).toBe(true);
    }
    await page.click('[data-menu-button]');
    expect(await state(page)).toBe('false');
    expect(await isVisible(page, '#site-nav')).toBe(false);
  });

  test('Escape closes it and puts focus back on the button', async () => {
    const page = await you.open('/', { phone: true });
    await page.click('[data-menu-button]');
    await page.keyboard.press('Escape');
    expect(await state(page)).toBe('false');
    expect(await focused(page)).toBe('button.menu-button');
  });

  test('choosing a link closes it', async () => {
    const page = await you.open('/', { phone: true });
    await page.click('[data-menu-button]');
    await page.click('#site-nav a[href="/#work"]');
    expect(await state(page)).toBe('false');
  });

  test('on wider screens there is no Menu button; the nav is always there', async () => {
    const page = await you.open('/', { width: 1280 });
    expect(await isVisible(page, '[data-menu-button]')).toBe(false);
    expect(await isVisible(page, '#site-nav .links a')).toBe(true);
  });

  test('without JavaScript, phones get the full nav instead of a button that does nothing', async () => {
    const page = await you.open('/', { phone: true, javascript: false });
    expect(await isVisible(page, '[data-menu-button]')).toBe(false);
    expect(await isVisible(page, '#site-nav .links a')).toBe(true);
  });
});

describe.skipIf(!site.email)('email links', () => {
  const address = `${site.email?.user}@${site.email?.domain}`;

  test('become mailto: links once the page loads', async () => {
    const page = await you.open('/');
    const hrefs = await page.$$eval('a[data-email-user]', (links) =>
      links.map((a) => a.getAttribute('href')),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs)).toEqual(new Set([`mailto:${address}`]));
  });

  test('the résumé spells the address out', async () => {
    const page = await you.open('/resume/');
    expect(await page.$eval('a[data-email-text]', (a) => a.textContent)).toBe(address);
  });

  test('without JavaScript they point to the contact section and the address stays hidden', async () => {
    const page = await you.open('/', { javascript: false });
    const hrefs = await page.$$eval('a[data-email-user]', (links) =>
      links.map((a) => a.getAttribute('href')),
    );
    expect(new Set(hrefs)).toEqual(new Set(['/#contact']));
    expect(await page.evaluate(() => document.body.innerText)).not.toContain(address);
  });
});

describe('keyboard', () => {
  test('the first Tab shows a "Skip to content" link', async () => {
    const page = await you.open('/');
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('a.skip-link');
    // It slides in from above the page (in 0.01 ms with reduced motion, still a transition).
    await page.waitForFunction(
      () => document.querySelector('.skip-link')!.getBoundingClientRect().top >= 0,
      { timeout: 1000, polling: 'raf' },
    );
  });

  test('following it moves on to the main content', async () => {
    const page = await you.open('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    expect(new URL(page.url()).hash).toBe('#main');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('main') !== null)).toBe(true);
  });

  test('every link and button on the home page can be reached with Tab', async () => {
    const page = await you.open('/');
    const reachable = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        return element && element !== document.body ? element.outerHTML.slice(0, 120) : '';
      });
      if (!id || reachable.has(id)) break;
      reachable.add(id);
    }
    const interactive = await page.$$eval('a[href], button', (elements) =>
      elements
        .filter((element) => element.checkVisibility())
        .map((element) => element.outerHTML.slice(0, 120)),
    );
    expect(interactive.filter((element) => !reachable.has(element))).toEqual([]);
  });
});

describe('jumping to a section', () => {
  test.each(['#work', '#education', '#projects'])(
    '/%s lands with the heading clear of the sticky header',
    async (hash) => {
      for (const options of [{ width: 1280 }, { phone: true }]) {
        const page = await you.open(`/${hash}`, options);
        const { headerBottom, headingTop } = await page.evaluate((target) => {
          const header = document.querySelector('.site-header')!.getBoundingClientRect();
          const heading = document.querySelector(`${target} h2`)!.getBoundingClientRect();
          return { headerBottom: header.bottom, headingTop: heading.top };
        }, hash);
        expect(headingTop, JSON.stringify(options)).toBeGreaterThanOrEqual(headerBottom);
        await page.close();
      }
    },
  );

  test('Contact brings the call to action into view below the header', async () => {
    const page = await you.open('/');
    await page.click('#site-nav a[href="#contact"]');
    await page.waitForFunction(() => location.hash === '#contact');
    const { headerBottom, top, bottom, viewport } = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect();
      const cta = document.querySelector('#contact h2')!.getBoundingClientRect();
      return {
        headerBottom: header.bottom,
        top: cta.top,
        bottom: cta.bottom,
        viewport: innerHeight,
      };
    });
    expect(top).toBeGreaterThanOrEqual(headerBottom);
    expect(bottom).toBeLessThanOrEqual(viewport);
  });
});

describe('every page', () => {
  test.each(pages)('%s loads only from this site, with no errors', async (path) => {
    const page = await you.open(path);
    expect(you.problems(page)).toEqual([]);
  });

  test('unknown addresses get the 404 page, with a 404 status', async () => {
    const page = await you.open('/');
    const response = await page.goto(new URL('/no-such-page/', page.url()).href);
    expect(response?.status()).toBe(404);
    expect(await page.$eval('h1', (h1) => h1.textContent)).toBe('Page not found.');
  });
});
