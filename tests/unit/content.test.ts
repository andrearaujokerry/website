// The order and filtering rules in src/lib/content.ts, with a stand-in for Astro's content store
// so each test can supply exactly the entries it needs (drafts, ties, unfeatured projects…).
import type { CollectionEntry } from 'astro:content';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getCertifications,
  getEducation,
  getFeaturedProjects,
  getJobs,
  getPosts,
  getProjects,
  getSkills,
  hasCaseStudy,
  projectLink,
  projectMeta,
  statusLabel,
} from '../../src/lib/content';

const store = vi.hoisted(() => new Map<string, object[]>());
vi.mock('astro:content', () => ({
  getCollection: async (name: string, filter?: (entry: object) => boolean) =>
    (store.get(name) ?? []).filter((entry) => !filter || filter(entry)),
}));

afterEach(() => {
  store.clear();
  vi.unstubAllEnvs();
});

const month = (value: string) => new Date(`${value}-01T00:00:00Z`);
const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

type Project = CollectionEntry<'projects'>;

function project(id: string, data: Partial<Project['data']> = {}, body = ''): Project {
  return {
    id,
    collection: 'projects',
    body,
    data: {
      title: id,
      tagline: `${id} tagline`,
      description: `${id} description`,
      start: month('2024-01'),
      end: 'present',
      status: 'live',
      featured: false,
      order: 100,
      tech: [],
      highlights: [],
      links: {},
      draft: false,
      ...data,
    },
  } as Project;
}

const job = (id: string, start: string, draft = false) => ({
  id,
  data: { start: month(start), draft },
});
const post = (id: string, date: string, draft = false) => ({
  id,
  data: { date: new Date(date), draft },
});

describe('drafts', () => {
  const draftsIn = {
    jobs: [job('draft', '2025-01', true), job('published', '2024-01')],
    projects: [project('draft', { draft: true }), project('published')],
    posts: [post('draft', '2026-02-01', true), post('published', '2026-01-01')],
  };
  const load = { jobs: getJobs, projects: getProjects, posts: getPosts };

  for (const [collection, entries] of Object.entries(draftsIn)) {
    test(`${collection}: drafts are left out of production builds`, async () => {
      vi.stubEnv('DEV', false);
      store.set(collection, entries);
      expect(ids(await load[collection as keyof typeof load]())).toEqual(['published']);
    });

    test(`${collection}: drafts show in \`astro dev\`, so they can be previewed`, async () => {
      vi.stubEnv('DEV', true);
      store.set(collection, entries);
      expect(ids(await load[collection as keyof typeof load]())).toContain('draft');
    });
  }
});

describe('ordering', () => {
  test('jobs: newest first', async () => {
    store.set('jobs', [job('2023', '2023-06'), job('2025', '2025-01'), job('2024', '2024-01')]);
    expect(ids(await getJobs())).toEqual(['2025', '2024', '2023']);
  });

  test('projects: featured first in their `order`, then the rest newest first', async () => {
    store.set('projects', [
      project('old', { start: month('2022-01') }),
      project('featured-second', { featured: true, order: 2, start: month('2020-01') }),
      project('new', { start: month('2026-01') }),
      project('featured-first', { featured: true, order: 1, start: month('2019-01') }),
    ]);
    expect(ids(await getProjects())).toEqual(['featured-first', 'featured-second', 'new', 'old']);
  });

  test('projects: featured ones with the same `order` fall back to newest first', async () => {
    store.set('projects', [
      project('older', { featured: true, start: month('2023-01') }),
      project('newer', { featured: true, start: month('2025-01') }),
    ]);
    expect(ids(await getProjects())).toEqual(['newer', 'older']);
  });

  test('featured projects: only the featured ones, in order', async () => {
    store.set('projects', [
      project('not-featured', { start: month('2026-01') }),
      project('b', { featured: true, order: 2 }),
      project('a', { featured: true, order: 1 }),
    ]);
    expect(ids(await getFeaturedProjects())).toEqual(['a', 'b']);
  });

  test('posts: newest first', async () => {
    store.set('posts', [post('march', '2026-03-01'), post('may', '2026-05-01')]);
    expect(ids(await getPosts())).toEqual(['may', 'march']);
  });

  test('education: newest first', async () => {
    store.set('education', [job('undergrad', '2021-09'), job('masters', '2026-09')]);
    expect(ids(await getEducation())).toEqual(['masters', 'undergrad']);
  });

  test('skills: by their `order`', async () => {
    store.set('skills', [
      { id: 'tools', data: { order: 3 } },
      { id: 'languages', data: { order: 1 } },
      { id: 'frameworks', data: { order: 2 } },
    ]);
    expect(ids(await getSkills())).toEqual(['languages', 'frameworks', 'tools']);
  });

  test('certifications: in the order they appear in the file', async () => {
    store.set('certifications', [{ id: 'second-listed' }, { id: 'first-listed' }]);
    expect(ids(await getCertifications())).toEqual(['second-listed', 'first-listed']);
  });
});

describe('project labels', () => {
  test('every status has a readable label', () => {
    expect(statusLabel('live')).toBe('Live');
    expect(statusLabel('in-progress')).toBe('In progress');
    expect(statusLabel('complete')).toBe('Complete');
    expect(statusLabel('archived')).toBe('Archived');
  });

  test('cards show the start year and status, read in UTC', () => {
    // In Los Angeles time this start date is still 2024.
    expect(projectMeta(project('p', { start: month('2025-01'), status: 'complete' }).data)).toBe(
      '2025 · Complete',
    );
  });

  test('a project links to its own page', () => {
    expect(projectLink(project('leadme')).href).toBe('/projects/leadme/');
  });

  test('the link says "Details" until the Markdown body holds a case study', () => {
    const empty = project('a', {}, '');
    const onlyComments = project('b', {}, '\n<!-- The case study goes here -->\n  ');
    expect(hasCaseStudy(empty)).toBe(false);
    expect(hasCaseStudy(onlyComments)).toBe(false);
    expect(projectLink(onlyComments).label).toBe('Details');
  });

  test('the link says "Case study" once the body has writing', () => {
    const written = project('c', {}, '<!-- notes -->\n## Problem\nLeads were slipping away.');
    expect(hasCaseStudy(written)).toBe(true);
    expect(projectLink(written).label).toBe('Case study');
  });
});
