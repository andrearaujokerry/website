// The site's Worker code. Almost every request is a static file from dist/, which Cloudflare
// answers without running this. Only the paths in `assets.run_worker_first` (wrangler.jsonc)
// reach it: the terminal (github.com/andrearaujokerry/bloomberg), which runs on Render and is
// served at /projects/terminal through this proxy, so visitors stay on this domain.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Where the terminal runs, e.g. https://terminal-tbmn.onrender.com */
  TERMINAL_ORIGIN: string;
}

/**
 * The terminal's page, plus the root paths that page loads and calls: its build in /assets/, its
 * REST API in /api/ and its live feed on /ws/ (the app assumes it sits at the root of its origin).
 * Keep in sync with `run_worker_first` in wrangler.jsonc and PROXIED in scripts/check-links.mjs.
 */
const TERMINAL_PATHS = /^\/(?:projects\/terminal(?:\/.*)?|api\/.*|ws\/.*|assets\/.*)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!TERMINAL_PATHS.test(url.pathname)) return env.ASSETS.fetch(request);
    if (!env.TERMINAL_ORIGIN) {
      // Say what's wrong instead of crashing (e.g. a preview without previews.vars).
      return new Response('TERMINAL_ORIGIN is not set for this deployment (wrangler.jsonc).', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    return proxyToTerminal(request, url, env.TERMINAL_ORIGIN);
  },
};

async function proxyToTerminal(request: Request, url: URL, origin: string): Promise<Response> {
  const upstream = new URL(url.pathname + url.search, origin);

  const headers = new Headers(request.headers);
  headers.delete('host');
  // Tell the terminal which address the visitor used, and who they are, for its audit log.
  const visitor = request.headers.get('cf-connecting-ip');
  if (visitor) headers.set('x-forwarded-for', visitor);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.slice(0, -1));

  let response: Response;
  try {
    // WebSocket upgrades pass through as well: once the 101 comes back, the runtime relays frames.
    response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'manual',
    });
  } catch {
    return new Response(
      'The terminal is starting up or unavailable. Wait a minute, then reload the page.',
      {
        status: 502,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '30' },
      },
    );
  }

  // An upgraded WebSocket must be returned exactly as received.
  if (response.status === 101) return response;

  const proxied = new Response(response.body, response);
  // A redirect to the terminal's own address should keep the visitor on this domain.
  const location = proxied.headers.get('location');
  if (location?.startsWith(origin)) {
    proxied.headers.set('location', location.slice(origin.length) || '/');
  }
  // The terminal is an app behind a sign-in; its project page is what search engines should find.
  proxied.headers.set('x-robots-tag', 'noindex');
  return proxied;
}
