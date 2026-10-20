// Print the /resume/ page to public/resume.pdf with headless Chrome.
// Run with `npm run resume:pdf`, which builds the site first. Rerun it whenever the
// content changes. Set CHROME_PATH if Chrome isn't in the default macOS location.
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromeArgs, chromePath, serveDist } from './lib/serve-dist.mjs';

const output = fileURLToPath(new URL('../public/resume.pdf', import.meta.url));

const server = await serveDist();
const browser = await puppeteer.launch({ executablePath: chromePath, args: chromeArgs });

try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.goto(`${server.url}/resume/`, { waitUntil: 'networkidle0' });
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
  await server.close();
}
