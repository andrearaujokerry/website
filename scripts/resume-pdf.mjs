// Print the /resume/ page to public/resume.pdf with headless Chrome.
// Run with `npm run resume:pdf`, which builds the site first. Rerun it whenever the
// content changes. Set CHROME_PATH if Chrome isn't in the default macOS location.
import { writeFile } from 'node:fs/promises';
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
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
  });
  // The résumé is one page. If the content has outgrown it, keep the old PDF and say so.
  const raw = Buffer.from(pdf).toString('latin1');
  const pages = raw.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
  if (pages === 1) {
    await writeFile(output, pdf);
    console.log(`Wrote ${output}`);
  } else {
    console.error(
      `The résumé prints on ${pages} pages, so ${output} was not updated. Shorten the content ` +
        '(or tighten the print styles in src/pages/resume.astro) until it fits on one page.',
    );
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  await server.close();
}
