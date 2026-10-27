// Page transitions in Chrome (src/styles/transitions.css): the kind each navigation gets, that a
// project's tile is the shape that grows and shrinks, and that reduced motion turns them off.
import type { Page } from 'puppeteer-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { launch, pages, type Visitor } from '../support/site';

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

interface Recorded {
  /** The transition's types, e.g. ["open"]. */
  types?: string[];
  /** The parts being animated, e.g. "::view-transition-group(project-tile)". */
  parts?: string[];
  /** The colour given to the project tile's shape. */
  tint?: string;
  /** Why the browser skipped the transition, if it did. */
  skipped?: string;
}

/**
 * Runs in every new page: records the transition that revealed it as `window.recorded`, once
 * it has finished (clicks don't reach the page while one is running).
 */
function recordTransitions() {
  type Revealed = Event & {
    viewTransition: (ViewTransition & { types: Iterable<string> }) | null;
  };
  const store = window as unknown as { recorded?: Recorded };
  addEventListener('pageswap', () => (store.recorded = undefined));
  addEventListener('pagereveal', (event) => {
    const transition = (event as Revealed).viewTransition;
    if (!transition) return;
    const recorded: Recorded = {};
    transition.ready.then(
      () => {
        const parts = document
          .getAnimations()
          .map((animation) => (animation.effect as KeyframeEffect | null)?.pseudoElement);
        recorded.types = [...transition.types];
        recorded.parts = [...new Set(parts.filter((part): part is string => Boolean(part)))];
        recorded.tint = document.documentElement.style.getPropertyValue('--transition-tint');
      },
      (error: unknown) => (recorded.skipped = String(error)),
    );
    transition.finished.then(() => (store.recorded = recorded));
  });
}

/** Opens a page with motion on, recording each transition. */
const visit = (path: string, options: { phone?: boolean } = {}) =>
  you.open(path, { ...options, reducedMotion: false, beforeLoad: recordTransitions });

/** Does `action`, waits for the next page, and returns how it arrived. */
async function arrive(page: Page, action: () => Promise<unknown>): Promise<Recorded> {
  await Promise.all([page.waitForNavigation(), action()]);
  await page.waitForFunction(() => (window as unknown as { recorded?: Recorded }).recorded, {
    timeout: 5000,
  });
  return page.evaluate(() => (window as unknown as { recorded: Recorded }).recorded);
}

const tileColour = (page: Page, project: string) =>
  page.$eval(
    `.project a[href="${project}"]`,
    (link) => getComputedStyle(link.closest('.project')!.querySelector('.frame')!).backgroundColor,
  );

describe('between sections', () => {
  test.each([
    ['/', '#site-nav a[href="/projects/"]', 'section-forward'],
    ['/projects/', '#site-nav a[href="/about/"]', 'section-forward'],
    ['/about/', 'a.wordmark', 'section-back'],
    ['/', 'footer a[href="/resume/"]', 'section-forward'],
    ['/resume/', '#site-nav a[href="/projects/"]', 'section-back'],
  ])('%s → %s sweeps the tiles: %s', async (path, link, type) => {
    const page = await visit(path);
    const arrived = await arrive(page, () => page.click(link));
    expect(arrived.types).toEqual([type]);
    for (const tile of ['tile-1', 'tile-2', 'tile-3', 'tile-4']) {
      expect(arrived.parts).toContain(`::view-transition-group(${tile})`);
    }
    expect(you.problems(page)).toEqual([]);
  });
});

describe('projects', () => {
  test.each(['/projects/', '/'])(
    'from %s, a card opens its project by growing its tile, in its colour',
    async (path) => {
      const page = await visit(path);
      const project = '/projects/leadme/';
      const colour = await tileColour(page, project);
      const arrived = await arrive(page, () => page.click(`.project a[href="${project}"]`));
      expect(arrived.types).toEqual(['open']);
      expect(arrived.parts).toContain('::view-transition-group(project-tile)');
      expect(arrived.parts).toContain('::view-transition-image-pair(project-tile)');
      expect(arrived.tint).toBe(colour);
      expect(you.problems(page)).toEqual([]);
    },
  );

  test('going back shrinks the page into its card again', async () => {
    const page = await visit('/projects/');
    const project = '/projects/leadme/';
    const colour = await tileColour(page, project);
    await arrive(page, () => page.click(`.project a[href="${project}"]`));
    const arrived = await arrive(page, () => page.goBack());
    expect(arrived.types).toEqual(['close']);
    expect(arrived.parts).toContain('::view-transition-group(project-tile)');
    expect(arrived.tint).toBe(colour);
    expect(you.problems(page)).toEqual([]);
  });

  test('a card whose tile is scrolled away opens without a shape, never in an old colour', async () => {
    const page = await visit('/projects/');
    // Open and close one project first, so a colour from that visit is in storage.
    await arrive(page, () => page.click('.project a[href="/projects/leadme/"]'));
    await arrive(page, () => page.goBack());
    // Scroll the Terminal card's tile just out of view, leaving its link on screen.
    await page.$eval('.project a[href="/projects/bloomberg-terminal/"]', (link) => {
      const frame = link.closest('.project')!.querySelector('.frame')!;
      // Instant: with motion on, the page would otherwise still be scrolling at the click.
      scrollBy({ top: frame.getBoundingClientRect().bottom + 1, behavior: 'instant' });
    });
    const arrived = await arrive(page, () =>
      page.click('.project a[href="/projects/bloomberg-terminal/"]'),
    );
    expect(arrived.types).toEqual(['open']);
    expect(arrived.tint).toBe('');
  });

  test('with its card off screen, leaving a project sweeps instead', async () => {
    // The home page opens at Work, far above the project cards.
    const page = await visit('/projects/leadme/');
    const arrived = await arrive(page, () => page.click('#site-nav a[href="/#work"]'));
    expect(arrived.types).toEqual(['section-back']);
    expect(arrived.parts).not.toContain('::view-transition-group(project-tile)');
  });

  test('next and previous project swing the pages past each other', async () => {
    const page = await visit('/projects/leadme/');
    expect((await arrive(page, () => page.click('.pager a.next'))).types).toEqual(['step-forward']);
    expect((await arrive(page, () => page.click('.pager a.previous'))).types).toEqual([
      'step-back',
    ]);
    expect(you.problems(page)).toEqual([]);
  });

  test('on a phone too', async () => {
    const page = await visit('/projects/', { phone: true });
    const arrived = await arrive(page, () => page.click('.project a[href="/projects/leadme/"]'));
    expect(arrived.types).toEqual(['open']);
  });
});

describe('every transition', () => {
  test('keeps the header in place, as its own layer', async () => {
    const page = await visit('/');
    const arrived = await arrive(page, () => page.click('#site-nav a[href="/about/"]'));
    expect(arrived.parts).toContain('::view-transition-group(site-header)');
  });

  test('anything outside the row of pages simply crossfades', async () => {
    const page = await visit('/no-such-page/');
    expect((await arrive(page, () => page.click('main a[href="/projects/"]'))).types).toEqual([
      'fade',
    ]);
  });

  test.each(pages)('%s: every named element has its own name', async (path) => {
    const page = await visit(path);
    const names = await page.$$eval('*', (elements) =>
      elements
        .map((element) => getComputedStyle(element).viewTransitionName)
        .filter((name) => name !== 'none'),
    );
    expect(names).toEqual([...new Set(names)]);
    expect(names).toEqual(expect.arrayContaining(['site-header', 'tile-1', 'tile-4']));
  });
});

describe('reduced motion', () => {
  test('pages change at once, with no transition', async () => {
    const page = await you.open('/', { reducedMotion: true, beforeLoad: recordTransitions });
    await Promise.all([page.waitForNavigation(), page.click('#site-nav a[href="/projects/"]')]);
    expect(await page.evaluate(() => (window as { recorded?: unknown }).recorded)).toBeUndefined();
    expect(await page.evaluate(() => document.documentElement.dataset.transition)).toBeUndefined();
  });
});
