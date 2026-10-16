// Print the /resume/ page to public/resume.pdf with headless Chrome.
// Run with `npm run resume:pdf`, which builds the site first. Rerun it whenever the
// content changes. Set CHROME_PATH if Chrome isn't in the default macOS location.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const output = fileURLToPath(new URL('../public/resume.pdf', import.meta.url));
const chrome =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

// A minimal static server for dist/, so fonts and styles load exactly as on the live site.
const server = createServer(async (request, response) => {
  let path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (path.endsWith('/')) path += 'index.html';
  try {
    const body = await readFile(join(dist, path));
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await puppeteer.launch({ executablePath: chrome, headless: true });

try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(`http://127.0.0.1:${port}/resume/`, { waitUntil: 'networkidle0' });
  // Evaluated in the page (as a string, since `document` only exists there): wait for web fonts.
  await page.evaluate('document.fonts.ready');
  await page.pdf({
    path: output,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
  });
  console.log(`Wrote ${output}`);
} finally {
  await browser.close();
  server.close();
}
