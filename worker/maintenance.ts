// What every address shows while the site is hidden (MAINTENANCE in wrangler.jsonc). It's
// self-contained, with no files from the site, in the site's colours for light and dark.
export const maintenancePage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Andre Araujo-Kerry</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f5f2eb;
        --ink: #1c1a17;
        --muted: #5e594f;
        --accent: #ae3f19;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #181612;
          --ink: #eee9df;
          --muted: #ada697;
          --accent: #e8774a;
        }
      }
      body {
        display: grid;
        place-items: center;
        min-height: 100vh;
        min-height: 100dvh;
        margin: 0;
        padding: 1.5rem;
        background: var(--bg);
        color: var(--ink);
        font: 400 1.0625rem/1.6 system-ui, sans-serif;
      }
      main {
        max-width: 34rem;
      }
      .name {
        margin: 0;
        color: var(--muted);
        font: 500 0.8125rem/1.3 ui-monospace, Menlo, monospace;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 1rem 0 0;
        font: 400 clamp(2.5rem, 9vw, 4rem)/1 Georgia, 'Times New Roman', serif;
        letter-spacing: -0.02em;
      }
      h1 em {
        color: var(--accent);
      }
      .note {
        margin: 1.25rem 0 0;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <main>
      <p class="name">Andre Araujo-Kerry</p>
      <h1>Under <em>development</em>.</h1>
      <p class="note">This site is being worked on. Please check back soon.</p>
    </main>
  </body>
</html>
`;
