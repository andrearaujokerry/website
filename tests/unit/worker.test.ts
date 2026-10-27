// The Worker (worker/index.ts): static files for the site, and a proxy to the Terminal on Render
// for /projects/terminal and the root paths it uses. Also guards wrangler.jsonc, whose settings
// decide which requests reach the Worker at all.
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import worker from '../../worker/index';

const ORIGIN = 'https://terminal.example';
const SITE = 'https://andrearaujokerry.com';

const assets = { fetch: vi.fn(async () => new Response('static file')) };
let terminal: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  terminal = vi.fn<typeof fetch>(async () => new Response('from the terminal'));
  vi.stubGlobal('fetch', terminal);
});

afterEach(() => {
  vi.unstubAllGlobals();
  assets.fetch.mockClear();
});

function visit(
  path: string,
  init?: RequestInit,
  env = { ASSETS: assets, TERMINAL_ORIGIN: ORIGIN },
) {
  return worker.fetch(new Request(SITE + path, init), env);
}

/** The URL and options the Worker passed to fetch() for the terminal. */
function forwarded() {
  expect(terminal).toHaveBeenCalledTimes(1);
  const [url, init] = terminal.mock.calls[0];
  return { url: String(url), init: init!, headers: new Headers(init!.headers) };
}

// Paths that belong to the terminal, and look-alikes that belong to the site.
const terminalPaths = [
  '/projects/terminal',
  '/projects/terminal/',
  '/projects/terminal/screens/quote',
  '/api/v1/health',
  '/ws/v1',
  '/assets/index-B5cbyZIT.js',
];
const sitePaths = [
  '/',
  '/projects/',
  '/projects/bloomberg-terminal/',
  '/projects/terminally/',
  '/about/',
  '/resume.pdf',
  '/_astro/fonts/serif.woff2',
  '/api',
  '/apis/',
  '/assets',
  '/no-such-page/',
];

describe('routing', () => {
  test.each(sitePaths)('%s is a static file from the site', async (path) => {
    const response = await visit(path);
    expect(await response.text()).toBe('static file');
    expect(assets.fetch).toHaveBeenCalledTimes(1);
    expect(terminal).not.toHaveBeenCalled();
  });

  test.each(terminalPaths)('%s goes to the terminal, at the same path', async (path) => {
    const response = await visit(path);
    expect(await response.text()).toBe('from the terminal');
    expect(forwarded().url).toBe(ORIGIN + path);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  test('the query string goes along', async () => {
    await visit('/api/v1/quotes?symbols=AAPL,MSFT&live=1');
    expect(forwarded().url).toBe(`${ORIGIN}/api/v1/quotes?symbols=AAPL,MSFT&live=1`);
  });
});

describe('requests to the terminal', () => {
  test('keep their method, body and headers, and never follow redirects themselves', async () => {
    await visit('/api/v1/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'me@example.com' }),
      headers: { 'content-type': 'application/json', cookie: 'sid=abc' },
    });
    const { init, headers } = forwarded();
    expect(init.method).toBe('POST');
    expect(await new Response(init.body).text()).toBe('{"email":"me@example.com"}');
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('cookie')).toBe('sid=abc');
    expect(init.redirect).toBe('manual');
  });

  test('drop the Host header, so it matches the terminal and not this site', async () => {
    await visit('/projects/terminal', { headers: { host: 'andrearaujokerry.com' } });
    expect(forwarded().headers.has('host')).toBe(false);
  });

  test('say who the visitor is and which address they used, replacing anything they sent', async () => {
    await visit('/api/v1/status', {
      headers: { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.0.0.1' },
    });
    const { headers } = forwarded();
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
    expect(headers.get('x-forwarded-host')).toBe('andrearaujokerry.com');
    expect(headers.get('x-forwarded-proto')).toBe('https');
  });
});

describe('responses from the terminal', () => {
  test('come back with their status, body and headers', async () => {
    terminal.mockResolvedValueOnce(
      new Response('{"error":"AUTH_REQUIRED"}', {
        status: 401,
        headers: { 'content-type': 'application/json', 'set-cookie': 'sid=; Max-Age=0' },
      }),
    );
    const response = await visit('/api/v1/status');
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('{"error":"AUTH_REQUIRED"}');
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('set-cookie')).toBe('sid=; Max-Age=0');
  });

  test('are kept out of search results; the project page is what should be found', async () => {
    const response = await visit('/projects/terminal');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });

  test('redirects to the terminal’s own address stay on this site', async () => {
    terminal.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: `${ORIGIN}/projects/terminal?signed-in` },
      }),
    );
    const response = await visit('/api/v1/session');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/projects/terminal?signed-in');
  });

  test('a redirect to the bare terminal address goes to this site’s root', async () => {
    terminal.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: ORIGIN } }),
    );
    expect((await visit('/api/v1/session')).headers.get('location')).toBe('/');
  });

  test('other redirects are left alone', async () => {
    for (const location of ['/projects/terminal', 'https://accounts.example.com/login']) {
      terminal.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location } }));
      expect((await visit('/api/v1/session')).headers.get('location')).toBe(location);
    }
  });

  test('a WebSocket upgrade (101) is handed back untouched, so the live feed connects', async () => {
    // Node can't construct a 101 Response; the Worker only needs to return this object as is.
    const upgrade = { status: 101, webSocket: {} } as unknown as Response;
    terminal.mockResolvedValueOnce(upgrade);
    const response = await visit('/ws/v1', { headers: { upgrade: 'websocket' } });
    expect(response).toBe(upgrade);
  });
});

describe('when something is wrong', () => {
  test('a terminal that is asleep or down gets a friendly 502 that asks to retry', async () => {
    terminal.mockRejectedValueOnce(new TypeError('fetch failed'));
    const response = await visit('/projects/terminal');
    expect(response.status).toBe(502);
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/);
    expect(await response.text()).toMatch(/starting up or unavailable/);
  });

  test('a deployment without TERMINAL_ORIGIN explains itself instead of crashing', async () => {
    const env = { ASSETS: assets, TERMINAL_ORIGIN: '' };
    const response = await visit('/projects/terminal', undefined, env);
    expect(response.status).toBe(500);
    expect(await response.text()).toMatch(/TERMINAL_ORIGIN is not set/);
    expect(terminal).not.toHaveBeenCalled();
  });

  test('…and the rest of the site still works without it', async () => {
    const response = await visit('/about/', undefined, { ASSETS: assets, TERMINAL_ORIGIN: '' });
    expect(await response.text()).toBe('static file');
  });
});

describe('wrangler.jsonc', () => {
  // Parsed with TypeScript's JSONC reader, which allows the comments and trailing commas.
  const { config, error } = ts.parseConfigFileTextToJson(
    'wrangler.jsonc',
    readFileSync('wrangler.jsonc', 'utf8'),
  );
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));

  /** Cloudflare's `run_worker_first` patterns: exact paths, or a prefix ending in `/*`. */
  const runsWorker = (path: string) =>
    (config.assets.run_worker_first as string[]).some((pattern) =>
      pattern.endsWith('/*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern,
    );

  test('every terminal path reaches the Worker before the static files', () => {
    for (const path of terminalPaths) expect(runsWorker(path), path).toBe(true);
  });

  test('no page of the site is sent to the Worker by mistake', () => {
    for (const path of sitePaths) expect(runsWorker(path), path).toBe(false);
  });

  test('the link checker reserves the same paths as the Worker', () => {
    // scripts/check-links.mjs runs as a script, so read its PROXIED pattern from the source.
    const source = readFileSync('scripts/check-links.mjs', 'utf8');
    const literal = source.match(/const PROXIED = \/(.+)\/;/)?.[1];
    expect(literal, 'PROXIED in scripts/check-links.mjs').toBeDefined();
    const proxied = new RegExp(literal!);
    for (const path of terminalPaths) expect(proxied.test(path), path).toBe(true);
    for (const path of sitePaths) expect(proxied.test(path), path).toBe(false);
  });

  test('the terminal address is https, and branch previews get it too', () => {
    // Previews don't inherit top-level vars (they'd see it as undefined), so it's set twice.
    expect(config.vars.TERMINAL_ORIGIN).toMatch(/^https:\/\//);
    expect(config.previews.vars.TERMINAL_ORIGIN).toBe(config.vars.TERMINAL_ORIGIN);
  });

  test('both hostnames of the domain are attached', () => {
    expect(config.routes).toEqual(
      expect.arrayContaining([
        { pattern: 'andrearaujokerry.com', custom_domain: true },
        { pattern: 'www.andrearaujokerry.com', custom_domain: true },
      ]),
    );
  });

  test('the workers.dev address and branch previews stay on alongside the domain', () => {
    // With routes set, Wrangler switches both off unless they're stated.
    expect(config.workers_dev).toBe(true);
    expect(config.preview_urls).toBe(true);
  });

  test('the site is served from the build, with the 404 page for unknown paths', () => {
    expect(config.main).toBe('worker/index.ts');
    expect(config.assets.directory).toBe('./dist');
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.assets.not_found_handling).toBe('404-page');
  });
});
