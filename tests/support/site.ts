// Shared setup for the site tests: the built site in dist/, read as files or served locally and
// opened in Chrome. Run `npm run build` first.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';
import puppeteer, { type Page } from 'puppeteer-core';
import { chromeArgs, chromePath, dist, serveDist } from '../../scripts/lib/serve-dist.mjs';

export { dist };
export const SITE = 'https://andrearaujokerry.com';

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('There is no build in dist/. Run `npm run build` first.');
}

/** Every file in dist/, relative to it, e.g. "about/index.html". */
export const files = readdirSync(dist, { recursive: true, encoding: 'utf8' }).map((file) =>
  file.replaceAll('\\', '/'),
);

/** Every HTML page, as URL paths: "/", "/about/", "/404.html", … */
export const pages = files
  .filter((file) => file.endsWith('.html'))
  .map((file) => `/${file.replace(/index\.html$/, '')}`)
  .sort();

/** The pages search engines should index: all but the 404 page and the styleguide. */
export const indexable = pages.filter((path) => path !== '/404.html' && path !== '/styleguide/');

/** A page's HTML exactly as the server sends it, before any script runs. */
export const source = (path: string) =>
  readFileSync(join(dist, path.endsWith('/') ? `${path}index.html` : path), 'utf8');

/** A page's HTML as a document to query. */
export const parse = (path: string) => parseHTML(source(path)).document;

/** Visible text with whitespace collapsed. */
export const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

export interface OpenOptions {
  /** Viewport width in CSS pixels (default 1280). */
  width?: number;
  /** A 390 × 844 touch screen, like a recent iPhone. */
  phone?: boolean;
  colorScheme?: 'light' | 'dark';
  /** Default true, so jumps to #anchors land at once instead of scrolling smoothly. */
  reducedMotion?: boolean;
  javascript?: boolean;
  /** Runs in the page before any of its own scripts. */
  beforeLoad?: () => void;
}

/** Sets how the OS would describe the visitor's preferences. */
export function emulatePreferences(
  page: Page,
  colorScheme: 'light' | 'dark',
  reducedMotion = true,
) {
  return page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: colorScheme },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
  ]);
}

/** Serves dist/ locally and starts Chrome. Each visitor gets a fresh profile (empty storage). */
export async function launch() {
  const server = await serveDist();
  const browser = await puppeteer.launch({ executablePath: chromePath, args: chromeArgs });

  async function visitor() {
    const context = await browser.createBrowserContext();
    // Problems seen on each page: errors, failed requests, and requests to other sites.
    const problems = new Map<Page, string[]>();

    async function open(path: string, options: OpenOptions = {}) {
      const { width = 1280, phone = false, colorScheme = 'light', reducedMotion = true } = options;
      const page = await context.newPage();
      const seen: string[] = [];
      problems.set(page, seen);
      page.on('pageerror', (error) =>
        seen.push(`script error: ${error instanceof Error ? error.message : String(error)}`),
      );
      page.on('console', (message) => {
        // The browser logs the 404 page's own status; that one is expected.
        if (message.type() === 'error' && !/status of 404/.test(message.text())) {
          seen.push(`console error: ${message.text()}`);
        }
      });
      page.on('requestfailed', (request) => seen.push(`failed: ${request.url()}`));
      page.on('request', (request) => {
        const url = request.url();
        if (!url.startsWith(server.url) && !url.startsWith('data:')) seen.push(`external: ${url}`);
      });

      await page.setViewport(
        phone
          ? { width: 390, height: 844, isMobile: true, hasTouch: true }
          : { width, height: 800 },
      );
      await emulatePreferences(page, colorScheme, reducedMotion);
      await page.setJavaScriptEnabled(options.javascript ?? true);
      if (options.beforeLoad) await page.evaluateOnNewDocument(options.beforeLoad);
      await page.goto(server.url + path, { waitUntil: 'load' });
      return page;
    }

    return {
      open,
      problems: (page: Page) => problems.get(page) ?? [],
      close: () => context.close(),
    };
  }

  return {
    url: server.url,
    browser,
    visitor,
    async close() {
      await browser.close();
      await server.close();
    },
  };
}

export type Visitor = Awaited<ReturnType<Awaited<ReturnType<typeof launch>>['visitor']>>;
