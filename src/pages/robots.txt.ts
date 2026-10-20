// robots.txt: crawling is allowed; until launch every page opts out with a noindex tag instead
// (see `launched` in src/site.config.ts), so crawlers can still read that instruction.
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('sitemap-index.xml', site);
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
