// Link-preview ("Open Graph") images, rendered at build time with Satori and resvg.
// src/pages/og/[slug].png.ts turns every card below into /og/<slug>.png.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { frontmatter as about } from '../content/about.md';
import { site } from '../site.config';
import { getProjects } from './content';
import { splitEmphasis } from './text';

export interface OgCard {
  slug: string;
  eyebrow: string;
  /** Wrap words in *asterisks* for the italic accent. */
  title: string;
  subtitle?: string;
}

/** One card per indexable page. Pages pass their slug to BaseLayout's `image` prop. */
export async function getOgCards(): Promise<OgCard[]> {
  const projects = await getProjects();
  return [
    { slug: 'home', eyebrow: site.role, title: site.headline },
    {
      slug: 'projects',
      eyebrow: 'Projects',
      title: site.pages.projects.title,
      subtitle: site.pages.projects.lede,
    },
    ...projects.map(({ id, data }) => ({
      slug: `project-${id}`,
      eyebrow: 'Project',
      title: data.title,
      subtitle: data.tagline,
    })),
    {
      slug: 'about',
      eyebrow: 'About',
      title: about.title ?? 'About',
      subtitle: `${site.role} · ${site.location}`,
    },
    {
      slug: 'resume',
      eyebrow: 'Résumé',
      title: site.name,
      subtitle: `${site.role} · ${site.location}`,
    },
  ];
}

const colors = {
  bg: '#f5f2eb',
  ink: '#1c1a17',
  muted: '#5e594f',
  faint: '#736d62',
  accent: '#ae3f19',
  rule: '#e0dacc',
};

// Satori can't read woff2, so it uses the Fontsource .woff files (same typefaces as the site).
const fontFile = (pkg: string, file: string) =>
  readFile(join(process.cwd(), 'node_modules', '@fontsource', pkg, 'files', file));

let fonts: Promise<Parameters<typeof satori>[1]['fonts']> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    fontFile('instrument-serif', 'instrument-serif-latin-400-normal.woff'),
    fontFile('instrument-serif', 'instrument-serif-latin-400-italic.woff'),
    fontFile('instrument-sans', 'instrument-sans-latin-400-normal.woff'),
    fontFile('instrument-sans', 'instrument-sans-latin-600-normal.woff'),
  ]).then(([serif, serifItalic, sans, sansBold]) => [
    { name: 'Serif', data: serif, weight: 400, style: 'normal' },
    { name: 'Serif', data: serifItalic, weight: 400, style: 'italic' },
    { name: 'Sans', data: sans, weight: 400, style: 'normal' },
    { name: 'Sans', data: sansBold, weight: 600, style: 'normal' },
  ]);
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

/**
 * The title as one span per word, so italic accents wrap like normal text. A word only gets
 * trailing space when the source has a space after it, so "*Andre*." keeps its full stop close.
 */
function titleWords(title: string) {
  const words: { text: string; em: boolean; spaceAfter: boolean }[] = [];
  for (const part of splitEmphasis(title)) {
    for (const [chunk] of part.text.matchAll(/\s+|\S+/g)) {
      const last = words.at(-1);
      if (/^\s/.test(chunk)) {
        if (last) last.spaceAfter = true;
      } else {
        words.push({ text: chunk, em: part.em, spaceAfter: false });
      }
    }
  }
  return words.map(({ text, em, spaceAfter }) =>
    el(
      'span',
      {
        marginRight: spaceAfter ? '0.24em' : 0,
        ...(em && { fontStyle: 'italic', color: colors.accent }),
      },
      text,
    ),
  );
}

export async function renderOgImage(card: OgCard) {
  const length = card.title.replaceAll('*', '').length;
  const titleSize = length > 60 ? 64 : length > 32 ? 80 : 104;

  const tree = el(
    'div',
    {
      // Satori sizes the content box, so these plus the padding make exactly 1200 × 630.
      width: 1040,
      height: 494,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px 64px',
      backgroundColor: colors.bg,
      color: colors.ink,
      fontFamily: 'Sans',
    },
    [
      el(
        'div',
        { display: 'flex', fontSize: 22, fontWeight: 600, letterSpacing: 3, color: colors.faint },
        card.eyebrow.toUpperCase(),
      ),
      el('div', { display: 'flex', flexDirection: 'column' }, [
        el(
          'div',
          {
            display: 'flex',
            flexWrap: 'wrap',
            fontFamily: 'Serif',
            fontSize: titleSize,
            lineHeight: 1.02,
            letterSpacing: -1,
          },
          titleWords(card.title),
        ),
        card.subtitle
          ? el(
              'div',
              {
                display: 'flex',
                marginTop: 28,
                maxWidth: 940,
                fontSize: 30,
                lineHeight: 1.4,
                color: colors.muted,
              },
              card.subtitle,
            )
          : el('div', { display: 'flex' }),
      ]),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingTop: 24,
          borderTop: `1px solid ${colors.rule}`,
        },
        [
          el('div', { display: 'flex', fontFamily: 'Serif', fontSize: 36 }, site.name),
          el('div', { display: 'flex', fontSize: 24, color: colors.faint }, 'andrearaujokerry.com'),
        ],
      ),
    ],
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
