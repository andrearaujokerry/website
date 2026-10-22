// Check every link in the built site. Run `npm run build` first, then `npm run check:links`.
//
// Internal links (including absolute links to the site's own domain, such as canonical URLs
// and share images) must point at a file in dist/, and #fragments must match an id on the
// target page. External links are only checked with --external, because other sites going
// down or blocking bots shouldn't fail CI.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { dist } from './lib/serve-dist.mjs';

const SITE = 'https://andrearaujokerry.com';
const checkExternal = process.argv.includes('--external');

// Served at runtime by the Worker's terminal proxy (worker/index.ts), not from dist/. Keep in sync
// with TERMINAL_PATHS there and `run_worker_first` in wrangler.jsonc.
const PROXIED = /^\/(?:projects\/terminal(?:\/.*)?|api\/.*|ws\/.*|assets\/.*)$/;

const htmlFiles = (await readdir(dist, { recursive: true })).filter((f) => f.endsWith('.html'));
const pages = new Map(); // URL path -> HTML
for (const file of htmlFiles) {
  const path = `/${file.replace(/index\.html$/, '')}`;
  pages.set(path, await readFile(join(dist, file), 'utf8'));
}

const idsCache = new Map();
const idsOn = (html) => {
  if (!idsCache.has(html))
    idsCache.set(html, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(html);
};

async function exists(path) {
  try {
    await stat(join(dist, path.endsWith('/') ? `${path}index.html` : path));
    return true;
  } catch {
    return false;
  }
}

const errors = new Set();
const external = new Map(); // URL -> pages that link to it

for (const [pagePath, html] of pages) {
  if (PROXIED.test(pagePath)) {
    errors.add(
      `${pagePath}: built at a path the Worker sends to the terminal, so no one can reach it`,
    );
  }
  // href, src and content="https://…" (Open Graph) attributes.
  const urls = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\scontent="(https?:\/\/[^"]+)"/g)].map((m) => m[1]),
  ];
  for (const raw of urls) {
    const value = raw.replaceAll('&amp;', '&');
    if (/^(mailto|tel|data|javascript):/.test(value)) continue;
    const url = new URL(value, SITE + pagePath);
    if (url.origin !== SITE) {
      if (!external.has(url.href)) external.set(url.href, new Set());
      external.get(url.href).add(pagePath);
      continue;
    }
    const target = decodeURIComponent(url.pathname);
    if (PROXIED.test(target)) continue;
    if (!(await exists(target))) {
      errors.add(`${pagePath}: broken link ${value}`);
      continue;
    }
    if (url.hash) {
      const targetHtml = pages.get(target);
      const id = decodeURIComponent(url.hash.slice(1));
      if (targetHtml && !idsOn(targetHtml).has(id)) {
        errors.add(`${pagePath}: ${value} points to a missing #${id}`);
      }
    }
  }
}

if (checkExternal) {
  for (const [url, from] of external) {
    try {
      let response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 405 || response.status === 403) {
        response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
      }
      if (!response.ok)
        errors.add(`external ${url} returned ${response.status} (from ${[...from].join(', ')})`);
    } catch (error) {
      errors.add(`external ${url} failed: ${error.message} (from ${[...from].join(', ')})`);
    }
  }
}

const summary = `${pages.size} pages, ${external.size} external links${checkExternal ? ' checked' : ' skipped (use --external)'}`;
if (errors.size) {
  console.error(`✖ ${errors.size} link problem(s) in ${summary}:\n  ${[...errors].join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ All internal links and #fragments resolve (${summary}).`);
