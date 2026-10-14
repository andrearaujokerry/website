// Read content collections in the order and shape pages need.
import { getCollection, type CollectionEntry } from 'astro:content';

type Project = CollectionEntry<'projects'>;

/** Drafts are visible in `astro dev` but left out of production builds. */
const isPublished = ({ data }: { data: { draft: boolean } }) => import.meta.env.DEV || !data.draft;

const newestFirst = (a: { data: { start: Date } }, b: { data: { start: Date } }) =>
  b.data.start.getTime() - a.data.start.getTime();

export async function getJobs() {
  return (await getCollection('jobs', isPublished)).sort(newestFirst);
}

/** Featured projects first, in their `order`; then everything else, newest first. */
export async function getProjects() {
  return (await getCollection('projects', isPublished)).sort(
    (a, b) =>
      Number(b.data.featured) - Number(a.data.featured) ||
      (a.data.featured ? a.data.order - b.data.order : 0) ||
      newestFirst(a, b),
  );
}

export async function getFeaturedProjects() {
  return (await getProjects()).filter((project) => project.data.featured);
}

export async function getPosts() {
  return (await getCollection('posts', isPublished)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}

export async function getEducation() {
  return (await getCollection('education')).sort(newestFirst);
}

export async function getCertifications() {
  return getCollection('certifications');
}

const statusLabels: Record<Project['data']['status'], string> = {
  live: 'Live',
  'in-progress': 'In progress',
  complete: 'Complete',
  archived: 'Archived',
};

/** Card label such as "2024 · Live". */
export function projectMeta({ start, status }: Project['data']) {
  return `${start.getUTCFullYear()} · ${statusLabels[status]}`;
}

/** True once a project's Markdown body has a written case study (HTML comments don't count). */
export function hasCaseStudy(project: Project) {
  return (project.body ?? '').replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;
}
