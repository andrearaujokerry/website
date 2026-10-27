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
npm test              # unit and component tests (no build needed)
npm run resume:pdf    # rebuild public/resume.pdf from /resume/ (needs Google Chrome)
```

## Hosting

The site is a Cloudflare Worker (`wrangler.jsonc`) at **https://andrearaujokerry.com**. Every merge to `main` deploys it, and every branch gets a preview at `https://<branch>-website.andre-araujo-kerry.workers.dev`.

- **Domain:** each deploy attaches `andrearaujokerry.com` and `www.andrearaujokerry.com` (`routes` in `wrangler.jsonc`). A Redirect Rule in the Cloudflare dashboard sends `www` to the bare domain.
- **workers.dev:** the site is also at https://website.andre-araujo-kerry.workers.dev, which helps on networks that block new domains. `public/_headers` keeps that copy and the previews out of search results.
- **Analytics:** Cloudflare Web Analytics, set up in the dashboard rather than in the code.

### The Terminal

Almost every request is a static file from `dist/`. The exception is the [Terminal](https://github.com/andrearaujokerry/bloomberg), which runs on Render and appears at **`/projects/terminal`**. A small proxy in `worker/index.ts` forwards that page to Render, along with the root paths the terminal loads and calls: `/assets/`, `/api/` and `/ws/` (including its WebSocket). So:

- **Those paths are reserved.** Don't add pages or files under `/projects/terminal`, `/api/`, `/ws/` or `/assets/`; `npm run check:links` fails if a page lands on one.
- **If the terminal moves**, change `TERMINAL_ORIGIN` in `wrangler.jsonc`.
- **To try the proxy locally**, run `npx wrangler dev` and open http://localhost:8787/projects/terminal.

## Tests and quality checks

All of these run on every pull request, and any failure blocks the merge.

**Unit and component tests** (`tests/unit/`) need no build and take a few seconds:

```sh
npm test              # run them once
npm run test:watch    # rerun them as you edit
```

They cover the date and text helpers, the content rules (schemas, drafts, ordering), every component and the page layout (rendered with Astro's Container API, including settings today's content doesn't use), the share images, and the Worker's Terminal proxy along with the routing in `wrangler.jsonc`.

**Site tests and checks** run against the build, so run `npm run build` first:

```sh
npm run quality       # everything below
npm run test:site     # the built pages in Chrome (tests/site/): content, SEO, privacy, theme, menu,
                      # keyboard, layout, print, and axe accessibility
npm run test:a11y     # just the axe checks: every page, both themes, desktop and phone
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

The résumé at `/resume/` is generated from the same content. After changing jobs, projects, education or skills, run `npm run resume:pdf` and commit the updated `public/resume.pdf` (set `CHROME_PATH` if Chrome isn't in the default macOS location). The résumé must fit on one page: if it doesn't, the command stops with an error and keeps the old PDF.
