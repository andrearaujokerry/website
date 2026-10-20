// Shared helpers for scripts and tests that load the built site in Chrome.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const dist = fileURLToPath(new URL('../../dist/', import.meta.url));

/** Chrome for puppeteer-core: CHROME_PATH if set, otherwise the default macOS install. */
export const chromePath =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Chrome's sandbox can't start on GitHub's Ubuntu runners, so CI runs without it. */
export const chromeArgs = process.env.CI ? ['--no-sandbox'] : [];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Serve dist/ on a free localhost port. Like Cloudflare, unknown paths get dist/404.html
 * with a 404 status. Returns the base URL and a close() function.
 */
export async function serveDist() {
  const server = createServer(async (request, response) => {
    let path = normalize(decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname));
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(dist, path));
      response.writeHead(200, {
        'content-type': types[extname(path)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      const notFound = await readFile(join(dist, '404.html')).catch(() => 'Not found');
      response.writeHead(404, { 'content-type': types['.html'] });
      response.end(notFound);
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
