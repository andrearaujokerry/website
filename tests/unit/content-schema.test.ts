// The rules every content file must follow (src/content.config.ts). The build applies the same
// schemas, so anything rejected here fails `npm run build` with the same message.
import { z } from 'astro/zod';
import { describe, expect, test, vi } from 'vitest';
import { collections } from '../../src/content.config';

vi.mock('astro:content', () => ({ defineCollection: (config: unknown) => config }));

type Name = keyof typeof collections;

// Astro passes an image() helper to schemas that accept images; this stand-in accepts any object.
const image = () => z.object({ src: z.string() });

function schemaOf(name: Name): z.ZodType {
  const { schema } = collections[name] as { schema: unknown };
  return typeof schema === 'function' ? schema({ image }) : (schema as z.ZodType);
}

function parse(name: Name, entry: object) {
  return schemaOf(name).safeParse(entry);
}

/** Each problem as "field: message", e.g. "start: Use YYYY-MM, for example 2025-01". */
function problems(name: Name, entry: object) {
  const result = parse(name, entry);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

// The smallest valid entry for each collection: every field here is required.
const minimal = {
  jobs: {
    role: 'Business Intelligence Co-op',
    company: 'Annaly Capital Management',
    location: 'New York, NY',
    start: '2025-01',
    end: '2025-08',
    summary: 'Built dashboards and pipelines.',
  },
  projects: {
    title: 'Terminal',
    tagline: 'A terminal in the browser.',
    description: 'A keyboard-first workstation.',
    start: '2026-09',
    end: 'present',
    status: 'live',
  },
  posts: { title: 'Hello', description: 'The first post.', date: '2026-10-01' },
  education: {
    school: 'Northeastern University',
    degree: 'B.S. Computer Science',
    location: 'Boston, MA',
    start: '2021-09',
    end: '2026-05',
  },
  certifications: { name: 'Building with the Claude API', issuer: 'Anthropic' },
  skills: { label: 'Languages', order: 1, items: ['Python'] },
} satisfies Record<Name, object>;

const data = (name: Name, entry: object) => {
  const result = parse(name, entry);
  if (!result.success) throw new Error(problems(name, entry).join('\n'));
  return result.data as Record<string, unknown>;
};

describe('every collection', () => {
  for (const [name, entry] of Object.entries(minimal) as [Name, object][]) {
    test(`${name}: the minimal entry is valid`, () => {
      expect(problems(name, entry)).toEqual([]);
    });

    test(`${name}: leaving out any required field names that field`, () => {
      for (const field of Object.keys(entry)) {
        const without: Record<string, unknown> = { ...entry };
        delete without[field];
        expect(problems(name, without).join('\n'), `without "${field}"`).toMatch(
          new RegExp(`^${field}: `, 'm'),
        );
      }
    });
  }
});

describe('dates', () => {
  test('a month is stored as midnight UTC on the 1st', () => {
    expect(data('jobs', minimal.jobs).start).toEqual(new Date('2025-01-01T00:00:00Z'));
  });

  test('"present" marks something ongoing', () => {
    expect(data('projects', { ...minimal.projects, end: 'present' }).end).toBe('present');
  });

  test.each(['2025-1', '2025-13', '2025-00', '25-01', '2025/01', 'January 2025', '2025-01-15'])(
    'rejects %j with a hint about the format',
    (value) => {
      expect(problems('jobs', { ...minimal.jobs, start: value })).toEqual([
        'start: Use YYYY-MM, for example 2025-01',
      ]);
    },
  );

  test('an end date that is neither a month nor "present" says both are allowed', () => {
    expect(problems('jobs', { ...minimal.jobs, end: 'now' })).toEqual([
      'end: Use YYYY-MM, for example 2025-08, or "present"',
    ]);
  });

  test('post dates accept a full date', () => {
    expect(data('posts', minimal.posts).date).toEqual(new Date('2026-10-01'));
    expect(problems('posts', { ...minimal.posts, date: 'soon' })).not.toEqual([]);
  });
});

describe('defaults', () => {
  test('jobs: no highlights, tech or draft flag needed', () => {
    expect(data('jobs', minimal.jobs)).toMatchObject({ highlights: [], tech: [], draft: false });
  });

  test('projects: unfeatured, ordered last, published, with no links', () => {
    expect(data('projects', minimal.projects)).toMatchObject({
      featured: false,
      order: 100,
      tech: [],
      highlights: [],
      links: {},
      draft: false,
    });
  });

  test('posts: no tags, published', () => {
    expect(data('posts', minimal.posts)).toMatchObject({ tags: [], draft: false });
  });

  test('education: no coursework needed', () => {
    expect(data('education', minimal.education)).toMatchObject({ coursework: [] });
  });
});

describe('links', () => {
  const webLinks = [
    ['jobs', 'url'],
    ['projects', 'links.source'],
    ['certifications', 'url'],
  ] as const;

  const withLink = (name: Name, path: string, value: string) => {
    const entry: Record<string, unknown> = { ...minimal[name] };
    if (path.startsWith('links.')) entry.links = { [path.slice(6)]: value };
    else entry[path] = value;
    return entry;
  };

  for (const [name, path] of webLinks) {
    test(`${name} ${path}: accepts web addresses`, () => {
      for (const url of ['https://github.com/andrearaujokerry', 'http://example.com/page']) {
        expect(problems(name, withLink(name, path, url))).toEqual([]);
      }
    });

    test(`${name} ${path}: rejects anything that isn't http(s)`, () => {
      for (const url of [
        'javascript:alert(1)',
        'mailto:me@example.com',
        'ftp://example.com',
        'github.com/me',
      ]) {
        expect(problems(name, withLink(name, path, url)), url).not.toEqual([]);
      }
    });
  }

  test('a live link can be a web address or a path on this site', () => {
    for (const live of ['https://leadme.app', '/projects/terminal']) {
      expect(problems('projects', withLink('projects', 'links.live', live))).toEqual([]);
    }
  });

  test.each([
    'projects/terminal',
    '//evil.example/path',
    'javascript:alert(1)',
    'mailto:me@example.com',
  ])('a live link of %j is rejected with a hint', (live) => {
    expect(problems('projects', withLink('projects', 'links.live', live))).toEqual([
      'links.live: Use a full URL or a path on this site, e.g. /projects/terminal',
    ]);
  });
});

describe('projects', () => {
  test('status is one of live, in-progress, complete or archived', () => {
    for (const status of ['live', 'in-progress', 'complete', 'archived']) {
      expect(problems('projects', { ...minimal.projects, status })).toEqual([]);
    }
    expect(problems('projects', { ...minimal.projects, status: 'done' })).toHaveLength(1);
  });

  test('order is a whole number', () => {
    expect(problems('projects', { ...minimal.projects, order: 1.5 })).toHaveLength(1);
  });

  test('a cover image needs alt text', () => {
    const cover = { src: '/screenshot.png' };
    expect(problems('projects', { ...minimal.projects, cover })).toEqual([
      'coverAlt: Add coverAlt to describe the cover image',
    ]);
    expect(problems('projects', { ...minimal.projects, cover, coverAlt: 'The dashboard' })).toEqual(
      [],
    );
  });
});

describe('skills and certifications', () => {
  test('a skill group lists at least one item', () => {
    expect(problems('skills', { ...minimal.skills, items: [] })).toHaveLength(1);
  });

  test('a certification date, when given, is a month', () => {
    expect(data('certifications', { ...minimal.certifications, date: '2026-03' }).date).toEqual(
      new Date('2026-03-01T00:00:00Z'),
    );
    expect(problems('certifications', { ...minimal.certifications, date: 'March 2026' })).toEqual([
      'date: Use YYYY-MM, for example 2025-01',
    ]);
  });
});
