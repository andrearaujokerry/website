// Components and the page layout, rendered from source with Astro's Container API. Tests can
// change src/site.config.ts settings, so they also cover what today's content doesn't use: an
// availability note, a LinkedIn link, no résumé, the pre-launch noindex…
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, test } from 'vitest';
import Button from '../../src/components/Button.astro';
import Eyebrow from '../../src/components/Eyebrow.astro';
import FactsStrip from '../../src/components/FactsStrip.astro';
import Hero from '../../src/components/Hero.astro';
import JobRow from '../../src/components/JobRow.astro';
import PageIntro from '../../src/components/PageIntro.astro';
import PostRow from '../../src/components/PostRow.astro';
import ProjectCard from '../../src/components/ProjectCard.astro';
import Prose from '../../src/components/Prose.astro';
import SectionHead from '../../src/components/SectionHead.astro';
import SiteFooter from '../../src/components/SiteFooter.astro';
import SiteHeader from '../../src/components/SiteHeader.astro';
import TagList from '../../src/components/TagList.astro';
import ThemeToggle from '../../src/components/ThemeToggle.astro';
import BaseLayout from '../../src/layouts/BaseLayout.astro';
import { site, type SiteConfig } from '../../src/site.config';

const SITE = 'https://andrearaujokerry.com';
const container = await AstroContainer.create({ astroConfig: { site: SITE } });

type Component = Parameters<typeof container.renderToString>[0];
interface Options {
  props?: Record<string, unknown>;
  slots?: Record<string, string>;
  /** The page being rendered, e.g. "/about/". */
  path?: string;
}

async function render(component: Component, { props = {}, slots = {}, path = '/' }: Options = {}) {
  const html = await container.renderToString(component, {
    props,
    slots,
    request: new Request(SITE + path),
  });
  const page = /^\s*<(!doctype|html)/i.test(html) ? html : `<!doctype html><body>${html}</body>`;
  return { html, document: parseHTML(page).document };
}

/** Visible text with whitespace collapsed. */
const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const texts = (elements: Iterable<Element>) => [...elements].map(text);

// Tests may change the site settings; put them back after each one.
const original = structuredClone(site);
afterEach(() => {
  for (const key of Object.keys(site) as (keyof SiteConfig)[]) {
    if (!(key in original)) delete (site as Partial<SiteConfig>)[key];
  }
  Object.assign(site, structuredClone(original));
});
const configure = (changes: Partial<SiteConfig>) => Object.assign(site, changes);

describe('Hero', () => {
  test('the headline is the page’s h1, with the *asterisked* words in italics', async () => {
    configure({ headline: 'I build *useful* things for *people*.' });
    const { document } = await render(Hero);
    expect(text(document.querySelector('h1'))).toBe('I build useful things for people.');
    expect(texts(document.querySelectorAll('h1 em'))).toEqual(['useful', 'people']);
  });

  test('the line above the headline shows the role and location', async () => {
    configure({ role: 'Software engineer', location: 'Boston, MA', availability: undefined });
    const { document } = await render(Hero);
    expect(text(document.querySelector('.eyebrow'))).toBe('Software engineer · Boston, MA');
    expect(document.querySelector('.eyebrow .dot')).toBeNull();
  });

  test('an availability note replaces the location and gets a status dot', async () => {
    configure({ role: 'Software engineer', availability: 'Open to new roles' });
    const { document } = await render(Hero);
    expect(text(document.querySelector('.eyebrow'))).toBe('Software engineer · Open to new roles');
    expect(document.querySelector('.eyebrow .dot')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('contact links: Email and GitHub, plus LinkedIn once it’s set', async () => {
    configure({ links: { github: 'https://github.com/jane' } });
    let { document } = await render(Hero);
    expect(texts(document.querySelectorAll('.links a'))).toEqual(['Email', 'GitHub']);

    configure({
      links: { github: 'https://github.com/jane', linkedin: 'https://linkedin.com/in/jane' },
    });
    ({ document } = await render(Hero));
    expect(texts(document.querySelectorAll('.links a'))).toEqual(['Email', 'GitHub', 'LinkedIn']);
    expect(document.querySelector('a[href="https://linkedin.com/in/jane"]')).not.toBeNull();
  });

  test('the email address is never in the HTML; a script assembles it from two parts', async () => {
    configure({ email: { user: 'jane.doe', domain: 'example.com' } });
    const { html, document } = await render(Hero);
    const email = document.querySelector('a[data-email-user]');
    expect(email?.getAttribute('data-email-user')).toBe('jane.doe');
    expect(email?.getAttribute('data-email-domain')).toBe('example.com');
    expect(email?.getAttribute('href')).toBe('/#contact');
    expect(html).not.toContain('jane.doe@example.com');
    expect(html).not.toContain('mailto:');
  });

  test('without an email address there is no Email link', async () => {
    configure({ email: undefined });
    const { document } = await render(Hero);
    expect(document.querySelector('a[data-email-user]')).toBeNull();
  });
});

describe('SiteHeader', () => {
  test('the name links home and the nav lists every item in the settings', async () => {
    const { document } = await render(SiteHeader);
    expect(document.querySelector('a.wordmark')?.getAttribute('href')).toBe('/');
    expect(text(document.querySelector('a.wordmark'))).toBe(site.name);
    const links = [...document.querySelectorAll('#site-nav .links a')];
    expect(links.map((link) => [text(link), link.getAttribute('href')])).toEqual(
      site.nav.map((item) => [item.label, item.href]),
    );
  });

  test.each([
    ['/projects/', 'Projects'],
    ['/projects', 'Projects'],
    ['/about/', 'About'],
  ])('on %s, "%s" is marked as the current page', async (path, label) => {
    const { document } = await render(SiteHeader, { path });
    expect(texts(document.querySelectorAll('[aria-current="page"]'))).toEqual([label]);
  });

  test('anchor links (Work, Contact) are never marked current', async () => {
    const { document } = await render(SiteHeader, { path: '/' });
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  test('the phone menu button controls the nav and starts closed', async () => {
    const { document } = await render(SiteHeader);
    const button = document.querySelector('button[data-menu-button]');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(button?.getAttribute('aria-controls')).toBe('site-nav');
    expect(document.querySelector('nav#site-nav')?.getAttribute('aria-label')).toBe('Main');
  });

  test('the theme toggle and Résumé pill sit with the nav', async () => {
    const { document } = await render(SiteHeader);
    expect(document.querySelector('#site-nav .theme-toggle')).not.toBeNull();
    expect(document.querySelector('#site-nav a.pill')?.getAttribute('href')).toBe(site.resume);
  });

  test('without a résumé there is no Résumé pill', async () => {
    configure({ resume: undefined });
    const { document } = await render(SiteHeader);
    expect(document.querySelector('a.pill')).toBeNull();
  });
});

describe('ThemeToggle', () => {
  test('is a labelled toggle button that starts unpressed', async () => {
    const { document } = await render(ThemeToggle);
    const button = document.querySelector('button.theme-toggle');
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-label')).toBe('Dark theme');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SiteFooter', () => {
  test('is the #contact target, with the call to action', async () => {
    const { document } = await render(SiteFooter);
    expect(document.querySelector('footer')?.id).toBe('contact');
    expect(text(document.querySelector('footer h2'))).toBe(
      "Have a role or a project in mind? Let's talk.",
    );
  });

  test('"Email me" is the main button, assembled by script; GitHub is outlined beside it', async () => {
    configure({
      email: { user: 'jane', domain: 'example.com' },
      links: { github: 'https://github.com/jane' },
    });
    const { html, document } = await render(SiteFooter);
    const email = document.querySelector('a.button[data-email-user]');
    expect(email?.classList.contains('solid')).toBe(true);
    expect(text(email)).toBe('Email me ↗');
    expect(html).not.toContain('jane@example.com');
    expect(document.querySelector('a.button[href="https://github.com/jane"]')?.className).toContain(
      'outline',
    );
  });

  test('without an email address, GitHub becomes the main button', async () => {
    configure({ email: undefined, links: { github: 'https://github.com/jane' } });
    const { document } = await render(SiteFooter);
    expect(document.querySelector('a.button[data-email-user]')).toBeNull();
    expect(document.querySelector('a.button[href="https://github.com/jane"]')?.className).toContain(
      'solid',
    );
  });

  test('LinkedIn appears once its URL is set', async () => {
    configure({
      links: { github: 'https://github.com/jane', linkedin: 'https://linkedin.com/in/jane' },
    });
    const { document } = await render(SiteFooter);
    expect(text(document.querySelector('a.button[href="https://linkedin.com/in/jane"]'))).toBe(
      'LinkedIn ↗',
    );
  });

  test('the footer nav links About and Projects, and the résumé when there is one', async () => {
    let { document } = await render(SiteFooter);
    const hrefs = () =>
      [...document.querySelectorAll('nav[aria-label="Footer"] a')].map((a) =>
        a.getAttribute('href'),
      );
    expect(hrefs()).toEqual(['/about/', '/projects/', '/resume/']);

    configure({ resume: undefined });
    ({ document } = await render(SiteFooter));
    expect(hrefs()).toEqual(['/about/', '/projects/']);
  });

  test('the colophon shows this year and the name', async () => {
    const { document } = await render(SiteFooter);
    expect(text(document.querySelector('.colophon span'))).toBe(
      `© ${new Date().getFullYear()} ${site.name}`,
    );
  });
});

describe('Button', () => {
  test('with an href it’s a link, otherwise a button', async () => {
    let { document } = await render(Button, {
      props: { href: '/projects/' },
      slots: { default: 'Go' },
    });
    expect(document.querySelector('a.button.solid')?.getAttribute('href')).toBe('/projects/');

    ({ document } = await render(Button, { slots: { default: 'Go' } }));
    expect(document.querySelector('button.button.solid')?.getAttribute('type')).toBe('button');
  });

  test('takes an outline variant and a submit type', async () => {
    const { document } = await render(Button, { props: { variant: 'outline', type: 'submit' } });
    expect(document.querySelector('button.outline')?.getAttribute('type')).toBe('submit');
  });

  test('passes data attributes through', async () => {
    const { document } = await render(Button, {
      props: { href: '/#contact', 'data-email-user': 'jane', 'data-email-domain': 'example.com' },
    });
    const link = document.querySelector('a');
    expect(link?.getAttribute('data-email-user')).toBe('jane');
    expect(link?.getAttribute('data-email-domain')).toBe('example.com');
  });
});

describe('TagList', () => {
  test('lists every item, as small labels by default or body text', async () => {
    let { document } = await render(TagList, { props: { items: ['Python', 'SQL'] } });
    expect(texts(document.querySelectorAll('ul.tags.label li'))).toEqual(['Python', 'SQL']);

    ({ document } = await render(TagList, { props: { items: ['Git'], variant: 'text' } }));
    expect(document.querySelector('ul.tags.text')).not.toBeNull();
  });
});

describe('SectionHead', () => {
  test('is an h2 with an id, an optional note, and an optional link', async () => {
    const { document } = await render(SectionHead, {
      props: {
        id: 'work-title',
        title: 'Experience',
        note: '2024 — 2025',
        more: { label: 'All projects', href: '/projects/', arrow: '→' },
      },
    });
    expect(document.querySelector('h2')?.id).toBe('work-title');
    expect(text(document.querySelector('h2 small'))).toBe('2024 — 2025');
    const more = document.querySelector('a.more');
    expect(more?.getAttribute('href')).toBe('/projects/');
    // The arrow is decoration: screen readers hear just "All projects".
    expect(more?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('→');
  });

  test('leaves out the note and link when not given', async () => {
    const { document } = await render(SectionHead, { props: { title: 'Education' } });
    expect(document.querySelector('h2 small')).toBeNull();
    expect(document.querySelector('a')).toBeNull();
  });
});

describe('Eyebrow', () => {
  test('shows a status dot only when asked', async () => {
    let { document } = await render(Eyebrow, { slots: { default: 'Projects' } });
    expect(document.querySelector('.dot')).toBeNull();
    ({ document } = await render(Eyebrow, { props: { status: true }, slots: { default: 'Open' } }));
    expect(document.querySelector('.dot')).not.toBeNull();
  });
});

describe('PageIntro', () => {
  test('renders the eyebrow, an h1 with italic accents, the lede and extra content', async () => {
    const { document } = await render(PageIntro, {
      props: { eyebrow: 'Projects', title: "Things I've *built*.", lede: 'Tools and studies.' },
      slots: { default: '<p class="extra">More</p>' },
    });
    expect(text(document.querySelector('.eyebrow'))).toBe('Projects');
    expect(text(document.querySelector('h1'))).toBe("Things I've built.");
    expect(text(document.querySelector('h1 em'))).toBe('built');
    expect(text(document.querySelector('.lede'))).toBe('Tools and studies.');
    expect(document.querySelector('.extra')).not.toBeNull();
  });

  test('the eyebrow and lede are optional', async () => {
    const { document } = await render(PageIntro, { props: { title: 'About' } });
    expect(document.querySelector('.eyebrow')).toBeNull();
    expect(document.querySelector('.lede')).toBeNull();
  });
});

describe('FactsStrip', () => {
  test('shows each fact as a label and value', async () => {
    const items = [
      { label: 'Focus', value: 'Data pipelines' },
      { label: 'On the side', value: 'LeadMe' },
    ];
    const { document } = await render(FactsStrip, { props: { items } });
    expect(texts(document.querySelectorAll('dt'))).toEqual(['Focus', 'On the side']);
    expect(texts(document.querySelectorAll('dd'))).toEqual(['Data pipelines', 'LeadMe']);
    expect(document.querySelector('dl')?.getAttribute('style')).toBe('--count: 2');
  });

  test('lays out at most four columns', async () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, value: `V${i}` }));
    const { document } = await render(FactsStrip, { props: { items } });
    expect(document.querySelector('dl')?.getAttribute('style')).toBe('--count: 4');
  });
});

describe('JobRow', () => {
  const job = {
    role: 'Business Intelligence Co-op',
    company: 'Annaly Capital Management',
    dates: 'Jan 2025 — Aug 2025',
    summary: 'Built a firm-wide dashboard.',
  };

  test('shows the dates, role, company, location, summary and tech', async () => {
    const { document } = await render(JobRow, {
      props: { ...job, location: 'New York, NY', tech: ['Python', 'SQL'] },
    });
    expect(text(document.querySelector('.when'))).toBe('Jan 2025 — Aug 2025');
    expect(text(document.querySelector('h3'))).toBe('Business Intelligence Co-op');
    expect(text(document.querySelector('.company'))).toBe('Annaly Capital Management');
    expect(text(document.querySelector('.location'))).toBe('New York, NY');
    expect(text(document.querySelector('.detail p'))).toBe('Built a firm-wide dashboard.');
    expect(texts(document.querySelectorAll('.tags li'))).toEqual(['Python', 'SQL']);
  });

  test('links the company when it has a website', async () => {
    const { document } = await render(JobRow, { props: { ...job, url: 'https://www.annaly.com' } });
    const link = document.querySelector('.company a');
    expect(link?.getAttribute('href')).toBe('https://www.annaly.com');
    expect(link?.querySelector('[aria-hidden="true"]')?.textContent).toBe('↗');
  });

  test('leaves out the link, location and tech when there are none', async () => {
    const { document } = await render(JobRow, { props: job });
    expect(document.querySelector('.company a')).toBeNull();
    expect(document.querySelector('.location')).toBeNull();
    expect(document.querySelector('.tags')).toBeNull();
  });
});

describe('ProjectCard', () => {
  const card = { title: 'LeadMe', description: 'Finds leads in job changes.' };

  test('the title is an h3 under a section heading, or an h2 directly under the page title', async () => {
    let { document } = await render(ProjectCard, { props: card });
    expect(text(document.querySelector('h3.title'))).toBe('LeadMe');
    ({ document } = await render(ProjectCard, { props: { ...card, headingLevel: 2 } }));
    expect(text(document.querySelector('h2.title'))).toBe('LeadMe');
  });

  test('shows the meta label, description and tech', async () => {
    const { document } = await render(ProjectCard, {
      props: { ...card, meta: '2024 · Live', tech: ['Python', 'TypeScript'] },
    });
    expect(text(document.querySelector('.meta'))).toBe('2024 · Live');
    expect(text(document.querySelector('.description'))).toBe('Finds leads in job changes.');
    expect(texts(document.querySelectorAll('.tags li'))).toEqual(['Python', 'TypeScript']);
  });

  test('the link names the project for screen readers, with an arrow for sighted readers', async () => {
    const { document } = await render(ProjectCard, {
      props: { ...card, link: { label: 'Details', href: '/projects/leadme/' } },
    });
    const link = document.querySelector('.foot a');
    expect(link?.getAttribute('href')).toBe('/projects/leadme/');
    expect(text(link?.querySelector('.visually-hidden'))).toBe(': LeadMe');
    expect(link?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('→');
  });

  test('a link to another site gets ↗ instead of →', async () => {
    const { document } = await render(ProjectCard, {
      props: { ...card, link: { label: 'Visit', href: 'https://leadme.app', external: true } },
    });
    expect(document.querySelector('.foot a [aria-hidden="true"]')?.textContent?.trim()).toBe('↗');
  });

  test('without a link or tech, the card has neither', async () => {
    const { document } = await render(ProjectCard, { props: card });
    expect(document.querySelector('.foot a')).toBeNull();
    expect(document.querySelector('.tags')).toBeNull();
  });

  test('without a screenshot, a tinted frame shows the name (hidden from screen readers)', async () => {
    const { document } = await render(ProjectCard, { props: { ...card, tint: 3 } });
    expect(document.querySelector('.frame')?.getAttribute('data-tint')).toBe('3');
    const placeholder = document.querySelector('.frame .placeholder');
    expect(text(placeholder)).toBe('LeadMe');
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.frame img')).toBeNull();
  });
});

describe('PostRow', () => {
  test('shows the month with a machine-readable date, the linked title and reading time', async () => {
    const { document } = await render(PostRow, {
      props: {
        title: 'Hello',
        href: '/writing/hello/',
        date: new Date('2026-10-01T00:00:00Z'),
        readingTime: '6 min',
      },
    });
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-01');
    expect(text(document.querySelector('time'))).toBe('Oct 2026');
    expect(document.querySelector('a')?.getAttribute('href')).toBe('/writing/hello/');
    expect(text(document.querySelector('.read'))).toBe('6 min');
  });

  test('the reading time is optional', async () => {
    const { document } = await render(PostRow, {
      props: { title: 'Hello', href: '/writing/hello/', date: new Date('2026-10-01T00:00:00Z') },
    });
    expect(document.querySelector('.read')).toBeNull();
  });
});

describe('Prose', () => {
  test('wraps long-form content for its typography', async () => {
    const { document } = await render(Prose, { slots: { default: '<p>Long form.</p>' } });
    expect(text(document.querySelector('.prose p'))).toBe('Long form.');
  });
});

describe('BaseLayout', () => {
  const page = (props: Record<string, unknown> = {}, path = '/about/') =>
    render(BaseLayout, {
      props: { title: 'About · Jane', description: 'About Jane.', ...props },
      slots: { default: '<h1>Content</h1>' },
      path,
    });
  const meta = (document: Document, key: string) =>
    document.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content');

  test('sets the title, description, and an absolute canonical URL on the real domain', async () => {
    const { document } = await page();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.title).toBe('About · Jane');
    expect(meta(document, 'description')).toBe('About Jane.');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${SITE}/about/`,
    );
  });

  test('the title defaults to the site name', async () => {
    const { document } = await page({ title: undefined });
    expect(document.title).toBe(site.name);
  });

  test('link previews get Open Graph and Twitter tags with the page’s share image', async () => {
    const { document } = await page({ image: 'about' });
    expect(meta(document, 'og:type')).toBe('website');
    expect(meta(document, 'og:site_name')).toBe(site.name);
    expect(meta(document, 'og:title')).toBe('About · Jane');
    expect(meta(document, 'og:description')).toBe('About Jane.');
    expect(meta(document, 'og:url')).toBe(`${SITE}/about/`);
    expect(meta(document, 'og:image')).toBe(`${SITE}/og/about.png`);
    expect(meta(document, 'og:image:width')).toBe('1200');
    expect(meta(document, 'og:image:height')).toBe('630');
    expect(meta(document, 'og:image:alt')).toBe('About · Jane: About Jane.');
    expect(meta(document, 'twitter:card')).toBe('summary_large_image');
  });

  test('the share image defaults to the home page’s', async () => {
    const { document } = await page();
    expect(meta(document, 'og:image')).toBe(`${SITE}/og/home.png`);
  });

  test('once launched, pages are open to search engines', async () => {
    configure({ launched: true });
    const { document } = await page();
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  test('a page can still opt out with noindex (the 404 page, the styleguide)', async () => {
    configure({ launched: true });
    const { document } = await page({ noindex: true });
    expect(meta(document, 'robots')).toBe('noindex');
  });

  test('before launch, every page is noindex', async () => {
    configure({ launched: false });
    const { document } = await page();
    expect(meta(document, 'robots')).toBe('noindex');
  });

  test('canonical={false} leaves out the canonical link and og:url (for the 404 page)', async () => {
    const { document } = await page({ canonical: false }, '/404.html');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta(document, 'og:url')).toBeUndefined();
  });

  test('structured data is JSON-LD, with "<" escaped so it can never end the script early', async () => {
    const name = 'Jane </script><script>alert(1)</script>';
    const { html, document } = await page({ jsonLd: { '@type': 'Person', name } });
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script?.textContent ?? '')).toEqual({ '@type': 'Person', name });
    expect(html).not.toContain('</script><script>alert(1)');
  });

  test('applies the theme from an inline script in <head>, before anything paints', async () => {
    const { document } = await page();
    const inline = [...document.head.querySelectorAll('script:not([src]):not([type])')];
    const themeScript = inline.find((script) => script.textContent?.includes('dataset.theme'));
    expect(themeScript?.textContent).toContain("localStorage.getItem('theme')");
    expect(themeScript?.textContent).toContain('prefers-color-scheme: dark');
  });

  test('preloads the two self-hosted fonts the first screen needs', async () => {
    const { document } = await page();
    const preloads = [...document.querySelectorAll('link[rel="preload"][as="font"]')];
    expect(preloads).toHaveLength(2);
    for (const link of preloads) {
      expect(link.getAttribute('href')).toMatch(/^\/_astro\/fonts\/.+\.woff2$/);
    }
  });

  test('the skip link comes first and jumps to the main content', async () => {
    const { document } = await page();
    const first = document.body.firstElementChild;
    expect(first?.matches('a.skip-link')).toBe(true);
    expect(first?.getAttribute('href')).toBe('#main');
    expect(text(document.querySelector('main#main h1'))).toBe('Content');
  });

  test('every page has the header, footer, favicon and sitemap link', async () => {
    const { document } = await page();
    expect(document.querySelector('header.site-header')).not.toBeNull();
    expect(document.querySelector('footer#contact')).not.toBeNull();
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/favicon.svg');
    expect(document.querySelector('link[rel="sitemap"]')?.getAttribute('href')).toBe(
      '/sitemap-index.xml',
    );
  });
});
