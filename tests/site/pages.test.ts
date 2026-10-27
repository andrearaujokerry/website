// The built pages as the server sends them, before any script runs: what search engines, link
// previews and screen readers get. The checks follow the content rather than hard-coding it, so
// they keep passing as the copy changes.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { splitEmphasis, stripEmphasis } from '../../src/lib/text';
import { site } from '../../src/site.config';
import { pngSize } from '../support/png';
import { SITE, dist, files, indexable, pages, parse, text } from '../support/site';

const texts = (elements: Iterable<Element>) => [...elements].map(text);
const meta = (document: Document, key: string) =>
  document.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content') ??
  undefined;

const projectPages = pages.filter((path) => /^\/projects\/[^/]+\/$/.test(path));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Jan 2025 — Aug 2025" or "Jul 2024 — Present". */
const RANGE = /^([A-Z][a-z]{2} \d{4}) — ([A-Z][a-z]{2} \d{4}|Present)$/;
/** "Jan 2025" as a number that sorts by date. */
const monthValue = (label: string) => {
  const [month, year] = label.split(' ');
  return Number(year) * 12 + MONTHS.indexOf(month);
};

describe.each(pages)('%s', (path) => {
  const document = parse(path);

  test('is in English and fits phone screens', () => {
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(meta(document, 'viewport')).toBe('width=device-width, initial-scale=1');
  });

  test('has a title, a description and exactly one h1', () => {
    expect(document.title.trim()).not.toBe('');
    expect(meta(document, 'description')?.trim()).toBeTruthy();
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  test('starts with a skip link to its main content', () => {
    expect(document.body.firstElementChild?.getAttribute('href')).toBe('#main');
    expect(document.querySelector('main#main')).not.toBeNull();
  });

  test('its share image exists and is 1200 × 630', () => {
    const image = new URL(meta(document, 'og:image') ?? '');
    expect(image.origin).toBe(SITE);
    expect(pngSize(readFileSync(join(dist, image.pathname)))).toEqual({ width: 1200, height: 630 });
  });
});

describe('search engines', () => {
  test.each(indexable)('%s: may be indexed, at its address on the domain', (path) => {
    const document = parse(path);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE + path);
    expect(meta(document, 'og:url')).toBe(SITE + path);
  });

  test('the 404 page and the styleguide stay out of search results', () => {
    for (const path of ['/404.html', '/styleguide/']) {
      expect(meta(parse(path), 'robots'), path).toBe('noindex');
    }
    // The 404 page is served at any unknown address, so it has no address of its own.
    expect(parse('/404.html').querySelector('link[rel="canonical"]')).toBeNull();
  });

  test('every indexable page has its own title and description', () => {
    const titles = indexable.map((path) => parse(path).title);
    const descriptions = indexable.map((path) => meta(parse(path), 'description'));
    expect(new Set(titles).size).toBe(indexable.length);
    expect(new Set(descriptions).size).toBe(indexable.length);
  });

  test('robots.txt allows crawling and points to the sitemap', () => {
    expect(readFileSync(join(dist, 'robots.txt'), 'utf8')).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap-index.xml\n`,
    );
  });

  test('the sitemap lists exactly the indexable pages', () => {
    const locs = (file: string) =>
      [...readFileSync(join(dist, file), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    const listed = locs('sitemap-index.xml').flatMap((sitemap) => locs(new URL(sitemap).pathname));
    expect(listed.map((url) => url.replace(SITE, '')).sort()).toEqual([...indexable].sort());
  });

  test('the workers.dev copies of the site are marked noindex', () => {
    const headers = readFileSync(join(dist, '_headers'), 'utf8');
    expect(headers).toMatch(/^https:\/\/:\w+\.:\w+\.workers\.dev\/\*\n\s+X-Robots-Tag: noindex$/m);
  });
});

describe('privacy', () => {
  test.skipIf(!site.email)('the email address never appears whole in what the server sends', () => {
    const address = `${site.email?.user}@${site.email?.domain}`;
    const textFiles = files.filter((file) => /\.(html|xml|txt|js|css|json)$/.test(file));
    const containing = textFiles.filter((file) =>
      readFileSync(join(dist, file), 'utf8').includes(address),
    );
    expect(containing).toEqual([]);
    // Links only become mailto: links once the script has run in a browser.
    const mailtoLinks = pages.filter((path) => parse(path).querySelector('a[href^="mailto:"]'));
    expect(mailtoLinks).toEqual([]);
  });

  test('no page shows a phone number or a street address', () => {
    const phone = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
    const street =
      /\b\d{1,5}\s+(?:[A-Z][\w.]*\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b/;
    for (const path of pages) {
      const document = parse(path);
      const visible = [
        text(document.body),
        ...[...document.querySelectorAll('meta[content]')].map((m) => m.getAttribute('content')),
        text(document.querySelector('script[type="application/ld+json"]')),
      ].join('\n');
      expect(visible, path).not.toMatch(phone);
      expect(visible, path).not.toMatch(street);
    }
  });
});

describe('home page', () => {
  const document = parse('/');

  test('the headline comes from the settings, with its italic accent', () => {
    expect(text(document.querySelector('h1'))).toBe(stripEmphasis(site.headline));
    expect(texts(document.querySelectorAll('h1 em'))).toEqual(
      splitEmphasis(site.headline)
        .filter((part) => part.em)
        .map((part) => part.text),
    );
  });

  test('the facts strip shows every fact in the settings', () => {
    expect(texts(document.querySelectorAll('.facts dt'))).toEqual(site.facts.map((f) => f.label));
    expect(texts(document.querySelectorAll('.facts dd'))).toEqual(site.facts.map((f) => f.value));
  });

  test('experience is newest first; every job has dates, a role and a company', () => {
    const jobs = [...document.querySelectorAll('#work li.job')];
    expect(jobs.length).toBeGreaterThan(0);
    const starts = jobs.map((job) => {
      expect(text(job.querySelector('.when'))).toMatch(RANGE);
      expect(text(job.querySelector('h3'))).not.toBe('');
      expect(text(job.querySelector('.company'))).not.toBe('');
      return monthValue(text(job.querySelector('.when')).match(RANGE)![1]);
    });
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
  });

  test('the Experience heading spans the years of the jobs listed', () => {
    const years = texts(document.querySelectorAll('#work li.job .when')).flatMap((dates) =>
      dates
        .match(RANGE)!
        .slice(1)
        .map((end) => (end === 'Present' ? new Date().getFullYear() : Number(end.slice(-4)))),
    );
    expect(text(document.querySelector('#work-title small'))).toBe(
      `${Math.min(...years)} — ${Math.max(...years)}`,
    );
  });

  test.skipIf(!site.resume)('Experience offers the résumé PDF', () => {
    expect(document.querySelector('#work a.more')?.getAttribute('href')).toBe(site.resume);
  });

  test('education is listed, with any certifications', () => {
    expect(document.querySelectorAll('#education li.job').length).toBeGreaterThan(0);
    for (const cert of document.querySelectorAll('#education .certs li')) {
      expect(text(cert.querySelector('.issuer'))).not.toBe('');
    }
  });

  test('selected projects link to their pages, in the same order as the projects page', () => {
    const allProjects = [...parse('/projects/').querySelectorAll('article.project .foot a')].map(
      (a) => a.getAttribute('href'),
    );
    const selected = [...document.querySelectorAll('#projects article.project .foot a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(selected.length).toBeGreaterThan(0);
    const positions = selected.map((href) => allProjects.indexOf(href));
    expect(positions).not.toContain(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('structured data tells search engines who the site is about', () => {
    const person = JSON.parse(text(document.querySelector('script[type="application/ld+json"]')));
    expect(person).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: site.name,
      jobTitle: site.role,
      url: `${SITE}/`,
      sameAs: [site.links.github, site.links.linkedin].filter(Boolean),
    });
    expect(person.alumniOf.length).toBeGreaterThan(0);
  });
});

describe('projects', () => {
  const index = parse('/projects/');
  const order = [...index.querySelectorAll('article.project .foot a')].map((a) =>
    a.getAttribute('href'),
  );

  test('the projects page lists every project page exactly once', () => {
    expect([...order].sort()).toEqual([...projectPages].sort());
  });

  test('project cards are h2s, since they sit right under the page title', () => {
    expect(index.querySelectorAll('article.project h2.title')).toHaveLength(projectPages.length);
  });

  describe.each(projectPages)('%s', (path) => {
    const document = parse(path);
    const card = [...index.querySelectorAll('article.project')].find(
      (article) => article.querySelector('.foot a')?.getAttribute('href') === path,
    )!;

    test('its title matches its card', () => {
      expect(text(document.querySelector('h1'))).toBe(text(card.querySelector('.title')));
      expect(text(document.querySelector('.lede'))).not.toBe('');
    });

    test('shows when, status and stack', () => {
      expect(texts(document.querySelectorAll('.facts dt')).slice(0, 2)).toEqual(['When', 'Status']);
      expect(text(document.querySelector('.facts dd'))).toMatch(RANGE);
    });

    test('numbers its highlights in order', () => {
      const numbers = texts(document.querySelectorAll('.highlights .number'));
      expect(numbers).toEqual(numbers.map((_, i) => String(i + 1).padStart(2, '0')));
    });

    test('links go to the project itself (on the web or on this site) or its source', () => {
      for (const link of document.querySelectorAll('.page-intro .links a')) {
        expect(link.getAttribute('href')).toMatch(/^(https?:\/\/|\/[^/])/);
      }
    });

    test('its card says "Case study" only when the page has one', () => {
      const label = text(card.querySelector('.foot a')).split(':')[0];
      expect(label).toBe(document.querySelector('#case-study-title') ? 'Case study' : 'Details');
    });

    test('has the hidden backdrop its card’s tile grows into when opened', () => {
      const backdrops = document.querySelectorAll('.transition-backdrop');
      expect(backdrops).toHaveLength(1);
      expect(backdrops[0].getAttribute('aria-hidden')).toBe('true');
    });

    test('previous and next follow the projects page order', () => {
      const at = order.indexOf(path);
      const previous = document.querySelector('.pager a.previous');
      const next = document.querySelector('.pager a.next');
      expect(previous?.getAttribute('href')).toBe(order[at - 1]);
      expect(next?.getAttribute('href')).toBe(order[at + 1]);
      for (const link of [previous, next].filter((l): l is Element => l !== null)) {
        const target = parse(link.getAttribute('href')!);
        expect(text(link.querySelector('.title'))).toBe(text(target.querySelector('h1')));
      }
    });
  });
});

describe('about page', () => {
  const document = parse('/about/');

  test('has a bio and skills grouped by category', () => {
    expect(text(document.querySelector('.bio'))).not.toBe('');
    const groups = [...document.querySelectorAll('dl.skills > div')];
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(text(group.querySelector('dt'))).not.toBe('');
      expect(group.querySelectorAll('dd li').length).toBeGreaterThan(0);
    }
  });

  test.skipIf(!site.resume)('offers the résumé as a PDF and as a web page', () => {
    const hrefs = [...document.querySelectorAll('.resume a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([site.resume, '/resume/']);
  });
});

describe('résumé page', () => {
  const document = parse('/resume/');
  const section = (id: string) => document.querySelector(`section[aria-labelledby="${id}-title"]`);

  test('is headed by the name, role and location', () => {
    expect(text(document.querySelector('h1'))).toBe(site.name);
    expect(text(document.querySelector('.role'))).toBe(`${site.role} · ${site.location}`);
  });

  test('lists the email (assembled by script), this site and GitHub', () => {
    const contact = document.querySelector('ul.contact');
    expect(contact?.querySelector('a[data-email-user][data-email-text]')).not.toBeNull();
    expect(contact?.querySelector(`a[href="${SITE}/"]`)).not.toBeNull();
    if (site.links.github)
      expect(contact?.querySelector(`a[href="${site.links.github}"]`)).not.toBeNull();
  });

  test('has every section, filled from the same content as the rest of the site', () => {
    const headings = texts(document.querySelectorAll('h2'));
    expect(headings).toEqual(
      expect.arrayContaining(['Experience', 'Projects', 'Education', 'Skills']),
    );
    expect(section('experience')?.querySelectorAll('.item')).toHaveLength(
      parse('/').querySelectorAll('#work li.job').length,
    );
    expect(section('projects')?.querySelectorAll('.item')).toHaveLength(projectPages.length);
    expect(section('education')?.querySelectorAll('.item').length).toBeGreaterThan(0);
    expect(section('skills')?.querySelectorAll('dt').length).toBeGreaterThan(0);
  });

  test.skipIf(!site.resume)('offers the PDF', () => {
    expect(document.querySelector(`.download a[href="${site.resume}"]`)).not.toBeNull();
  });
});

describe('404 page', () => {
  const document = parse('/404.html');

  test('says the page wasn’t found and offers a way back', () => {
    expect(text(document.querySelector('h1'))).toBe('Page not found.');
    const hrefs = [...document.querySelectorAll('main a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/projects/']);
  });
});

describe('files', () => {
  test.skipIf(!site.resume)('the résumé is a one-page PDF', () => {
    const pdf = readFileSync(join(dist, site.resume!));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(1);
  });

  test('every share image is a 1200 × 630 PNG, and every one is used by a page', () => {
    const used = new Set(pages.map((path) => new URL(meta(parse(path), 'og:image')!).pathname));
    const images = files.filter((file) => file.startsWith('og/')).map((file) => `/${file}`);
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(pngSize(readFileSync(join(dist, image)))).toEqual({ width: 1200, height: 630 });
      expect(used, image).toContain(image);
    }
  });

  test('the favicon is an SVG', () => {
    expect(readFileSync(join(dist, 'favicon.svg'), 'utf8')).toMatch(/^<svg[\s>]/);
  });

  test('nothing is built at the paths the Worker sends to the Terminal', () => {
    for (const file of files) {
      expect(file).not.toMatch(/^(projects\/terminal|api|ws|assets)(\/|$)/);
    }
  });
});
