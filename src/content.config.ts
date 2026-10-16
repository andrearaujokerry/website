// Content collections: the schema every content file must match.
// A missing or malformed field fails the build with a message naming the file and field.
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** A month such as "2025-01", parsed to the first day of that month (UTC). */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM, for example 2025-01')
  .transform((value) => new Date(`${value}-01T00:00:00Z`));

/** The end of a date range: a month, or "present" for something ongoing. */
const endMonth = z.union([z.literal('present'), month], {
  error: 'Use YYYY-MM, for example 2025-08, or "present"',
});

const jobs = defineCollection({
  loader: file('src/content/jobs.yaml'),
  schema: z.object({
    role: z.string(),
    company: z.string(),
    url: z.url().optional(),
    location: z.string(),
    start: month,
    end: endMonth,
    /** One or two sentences for the Experience list. */
    summary: z.string(),
    /** Full impact statements, for the About page and résumé. */
    highlights: z.array(z.string()).default([]),
    tech: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        /** One line for cards and link previews. */
        tagline: z.string(),
        /** Two or three sentences for the project card. */
        description: z.string(),
        start: month,
        end: endMonth,
        status: z.enum(['live', 'in-progress', 'complete', 'archived']),
        /** Featured projects appear on the home page, in `order`. */
        featured: z.boolean().default(false),
        order: z.number().int().default(100),
        tech: z.array(z.string()).default([]),
        highlights: z.array(z.string()).default([]),
        links: z
          .object({
            live: z.url().optional(),
            source: z.url().optional(),
          })
          .default({}),
        /** 16:10 screenshot, at least 1600 × 1000 px. */
        cover: image().optional(),
        coverAlt: z.string().optional(),
        draft: z.boolean().default(false),
      })
      .refine((project) => !project.cover || project.coverAlt, {
        message: 'Add coverAlt to describe the cover image',
        path: ['coverAlt'],
      }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    school: z.string(),
    department: z.string().optional(),
    degree: z.string(),
    location: z.string(),
    start: month,
    end: endMonth,
    gpa: z.string().optional(),
    coursework: z.array(z.string()).default([]),
  }),
});

const certifications = defineCollection({
  loader: file('src/content/certifications.yaml'),
  schema: z.object({
    name: z.string(),
    issuer: z.string(),
    url: z.url().optional(),
    date: month.optional(),
  }),
});

const skills = defineCollection({
  loader: file('src/content/skills.yaml'),
  schema: z.object({
    label: z.string(),
    /** Position on the About page and résumé. */
    order: z.number().int(),
    items: z.array(z.string()).min(1),
  }),
});

export const collections = { jobs, projects, posts, education, certifications, skills };
