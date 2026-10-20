// Build-time link-preview images: /og/home.png, /og/project-leadme.png, …
import type { APIRoute, GetStaticPaths } from 'astro';
import { getOgCards, renderOgImage, type OgCard } from '../../lib/og';

export const getStaticPaths = (async () => {
  const cards = await getOgCards();
  return cards.map((card) => ({ params: { slug: card.slug }, props: { card } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgImage((props as { card: OgCard }).card);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
