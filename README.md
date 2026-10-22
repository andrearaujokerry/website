# website

My personal website

- [Requirements](REQUIREMENTS.md): what the site needs to do, prioritised P0–P2
- [Design demos](demos/README.md): three visual directions to choose from
- [Workplan](WORKPLAN.md): how the Editorial direction gets built and launched

## Development

Built with [Astro](https://astro.build). Needs Node 22.22.3 or newer (with nvm, run `nvm use` to pick up `.nvmrc`).

```sh
npm install
npm run dev           # local dev server at http://localhost:4321
npm run check         # type-check
npm run lint          # ESLint, including accessibility rules
npm run format        # format with Prettier
npm run build         # production build into dist/
npm run resume:pdf    # rebuild public/resume.pdf from /resume/ (needs Google Chrome)
```

## Hosting

The site is a Cloudflare Worker (`wrangler.jsonc`). Almost every request is a static file from `dist/`. The exception is the [Terminal](https://github.com/andrearaujokerry/bloomberg), which runs on Render and appears at **`/projects/terminal`**. A small proxy in `worker/index.ts` forwards that page to Render, along with the root paths the terminal loads and calls: `/assets/`, `/api/` and `/ws/` (including its WebSocket). So:

- **Those paths are reserved.** Don't add pages or files under `/projects/terminal`, `/api/`, `/ws/` or `/assets/`; `npm run check:links` fails if a page lands on one.
- **If the terminal moves**, change `TERMINAL_ORIGIN` in `wrangler.jsonc`.
- **To try the proxy locally**, run `npx wrangler dev` and open http://localhost:8787/projects/terminal.

## Quality checks

These run on every pull request after the build, and any failure blocks the merge. Run them locally after `npm run build`:

```sh
npm run quality       # all four checks below
npm run test:a11y     # axe accessibility checks: every page, both themes, desktop and phone
npm run check:links   # every internal link and #fragment resolves (add -- --external for outside links)
npm run check:html    # HTML validation (html-validate)
npm run lighthouse    # Lighthouse on mobile: scores, Core Web Vitals and page-weight budgets
```

The browser-based checks use Google Chrome; set `CHROME_PATH` if it isn't in the default macOS location. Lighthouse reports are saved to `.lighthouseci/reports/`.

## Editing content

| What                                       | Where                                                           |
| ------------------------------------------ | --------------------------------------------------------------- |
| Name, headline, intro, facts, contact info | `src/site.config.ts`                                            |
| Jobs                                       | `src/content/jobs.yaml`                                         |
| Education and certifications               | `src/content/education.yaml`, `src/content/certifications.yaml` |
| Projects (card and case study)             | `src/content/projects/*.md`                                     |
| Posts                                      | `src/content/posts/*.md`                                        |
| About page copy                            | `src/content/about.md`                                          |
| Skills (About page and résumé)             | `src/content/skills.yaml`                                       |

The rules for every field are in `src/content.config.ts`, and `npm run build` names the file and field if something is wrong. Set `draft: true` on an entry to hide it from the live site while you work on it; drafts still show in `npm run dev`. Templates are in [WORKPLAN.md, Appendix A](WORKPLAN.md#appendix-a--content-templates).

The résumé at `/resume/` is generated from the same content. After changing jobs, projects, education or skills, run `npm run resume:pdf` and commit the updated `public/resume.pdf` (set `CHROME_PATH` if Chrome isn't in the default macOS location).
