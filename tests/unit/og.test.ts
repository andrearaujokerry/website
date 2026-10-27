// Link-preview images (src/lib/og.ts): one card per indexable page, rendered to a 1200 × 630 PNG.
import { describe, expect, test, vi } from 'vitest';
import { frontmatter as about } from '../../src/content/about.md';
import { getOgCards, renderOgImage } from '../../src/lib/og';
import { site } from '../../src/site.config';
import { pngSize } from '../support/png';

const month = (value: string) => new Date(`${value}-01T00:00:00Z`);
vi.mock('astro:content', () => ({
  getCollection: async () => [
    {
      id: 'leadme',
      data: {
        title: 'LeadMe',
        tagline: 'Leads from job changes.',
        featured: true,
        order: 1,
        start: month('2024-07'),
        draft: false,
      },
    },
    {
      id: 'terminal',
      data: {
        title: 'Terminal',
        tagline: 'A terminal in the browser.',
        featured: false,
        order: 100,
        start: month('2026-09'),
        draft: false,
      },
    },
  ],
}));

describe('getOgCards', () => {
  test('makes one card for each page that can be shared', async () => {
    const slugs = (await getOgCards()).map((card) => card.slug);
    expect(slugs).toEqual([
      'home',
      'projects',
      'project-leadme',
      'project-terminal',
      'about',
      'resume',
    ]);
  });

  test('each card carries its page’s headline', async () => {
    const cards = Object.fromEntries((await getOgCards()).map((card) => [card.slug, card]));
    expect(cards.home).toMatchObject({ eyebrow: site.role, title: site.headline });
    expect(cards.projects).toMatchObject({
      title: site.pages.projects.title,
      subtitle: site.pages.projects.lede,
    });
    expect(cards['project-leadme']).toMatchObject({
      eyebrow: 'Project',
      title: 'LeadMe',
      subtitle: 'Leads from job changes.',
    });
    expect(cards.about).toMatchObject({ eyebrow: 'About', title: about.title ?? 'About' });
    expect(cards.resume).toMatchObject({ eyebrow: 'Résumé', title: site.name });
  });
});

describe('renderOgImage', () => {
  test('renders a 1200 × 630 PNG, the size link previews expect', async () => {
    const png = await renderOgImage({ slug: 'home', eyebrow: site.role, title: site.headline });
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });

  test('a long title and subtitle still fit the same size', async () => {
    const png = await renderOgImage({
      slug: 'long',
      eyebrow: 'Project',
      title: 'Medications: more *harm* than good? A study of adverse drug reactions at scale',
      subtitle:
        'Using the FDA Adverse Event Reporting System to predict outcomes from demographics.',
    });
    expect(pngSize(png)).toEqual({ width: 1200, height: 630 });
  });
});
