# Workplan: building the site

**Direction:** Editorial ([desktop](demos/1-editorial.png), [mobile](demos/1-editorial-mobile.png)). What the site must do, and how we know it's done, comes from [REQUIREMENTS.md](REQUIREMENTS.md).

**Launch scope:** every P0, plus four P1s that are cheap to build now and expensive to retrofit later: dark mode, the case-study page template, the About page and a simple 404. Everything else goes to the [backlog](#after-launch).

**Owners:** *You* = decisions, accounts and content. *Build* = code and configuration.

**How we work:** each phase ships as one pull request (or a few small ones). Every PR runs CI and gets its own preview link; merge when CI is green and the preview looks right.

---

## Timeline at a glance

| Phase | Outcome | Owner | Effort* |
| --- | --- | --- | --- |
| [0. Decisions and content](#phase-0--decisions-and-content) | Choices locked; content writing under way | You | 2 h + content |
| [1. Skeleton and pipeline](#phase-1--skeleton-and-pipeline) | Empty site live on a preview URL, CI green | Build (You: Cloudflare account) | 3–4 h |
| [2. Design system](#phase-2--design-system) | Tokens, fonts, light/dark themes, core components | Build | 6–8 h |
| [3. Content model](#phase-3--content-model) | Typed content for jobs, projects and posts | Build | 3–4 h |
| [4. Home page](#phase-4--home-page) | Matches the Editorial demo on desktop and mobile | Build | 6–8 h |
| [5. Inner pages](#phase-5--inner-pages) | Projects, case study, About, résumé, 404 | Build | 6–8 h |
| [6. Quality pass](#phase-6--quality-pass) | Accessibility, performance and SEO enforced in CI | Build | 5–7 h |
| [7. Launch](#phase-7--launch) | Real content, domain, analytics, final checklist | You + Build | 3–4 h |

\*Rough focused hours. The build is about 30–45 hours in total, or roughly five weeks at ~8 hours a week:

```
Week 1  Phase 0 + 1    content writing starts
Week 2  Phase 2 + 3
Week 3  Phase 4
Week 4  Phase 5
Week 5  Phase 6 + 7    launch
```

**Critical path: content.** The build uses the demo's placeholder content until Phase 7, so code never waits on copy. Launch does, so content writing starts in week 1.

---

## Decisions to lock first

| # | Decision | Recommendation | Why / alternatives |
| --- | --- | --- | --- |
| 1 | Framework | Astro (latest), fully static output | Requirements §9. Typed content collections and a built-in Fonts API (Astro 6+). |
| 2 | Styling | Plain CSS with custom properties: one tokens file plus component-scoped styles | The design is mostly typography, and the demo's values map 1:1 to tokens. Tailwind adds little here. |
| 3 | Hosting | Cloudflare Pages, connected to the GitHub repo | Free, HTTPS, automatic preview deploy for every PR. Cloudflare steers *full-stack* apps to Workers, but Pages remains the simple path for a purely static site. Alternatives: Netlify, Vercel. |
| 4 | Fonts | Instrument Serif + Instrument Sans, self-hosted. Dates and tags use the system monospace font | The demo also uses IBM Plex Mono, but §6 allows at most two font families. System monospace downloads nothing and looks almost identical at 12–13 px. Alternative: keep Plex Mono and relax §6. |
| 5 | Text colour | Darken the "faint" grey from `#8A8476` to `#736D62` | The demo's dates and tags have 3.3:1 contrast; AA needs 4.5:1. The new value gives 4.6:1 ([Appendix B](#appendix-b--design-tokens)). |
| 6 | Writing section | Build the posts collection, but hide the section until there are at least 2 posts | Writing is P2 (open question 4). This avoids an empty section at launch. |
| 7 | Résumé | A static PDF at launch; generate it from the experience data later (P2) | Keeps launch simple. |
| 8 | Analytics | Cloudflare Web Analytics | Free, cookie-free and from the same vendor as hosting. Alternatives: Plausible (paid), Umami (self-hosted). |
| 9 | Tooling | npm and Node 22, Prettier, ESLint (`eslint-plugin-astro`), `astro check` | Covers §10's "type-check, lint, build". |

---

## Phase 0 — Decisions and content
Owner: You

- [ ] Confirm or change the decisions above.
- [ ] Create a Cloudflare account (needed in Phase 1).
- [ ] Choose a domain name (needed in Phase 7).
- [ ] Write content, using the templates in [Appendix A](#appendix-a--content-templates):
  - [ ] A one-line headline, a 2–3 sentence intro, and the four hero facts: *Currently*, *Previously*, *Focus*, *On the side*.
  - [ ] Every role: title, company and URL, dates, remote or location, 1–3 impact statements with numbers, tech used.
  - [ ] 3–4 featured projects: name, one-liner, 2–3 sentence description, year, status, tech, links and a screenshot (16:10, at least 1600 × 1000 px).
  - [ ] Résumé PDF.
  - [ ] Availability (open to roles or not), email, GitHub and LinkedIn URLs.
  - [ ] Optional: photo, a longer bio for About, rough case-study notes per featured project.

**Done when** the decisions are confirmed and content is under way. It only needs to be finished by Phase 7.

## Phase 1 — Skeleton and pipeline

- [ ] Scaffold Astro (minimal template, strict TypeScript) in the repo root, keeping `README.md`, `REQUIREMENTS.md`, `WORKPLAN.md` and `demos/`.
- [ ] Add `.nvmrc` (Node 22) and scripts: `dev`, `build`, `preview`, `check` (`astro check`), `lint`, `format`.
- [ ] Add Prettier (with `prettier-plugin-astro`) and ESLint (`eslint-plugin-astro`).
- [ ] Add a GitHub Actions workflow, `.github/workflows/ci.yml`: install → check → lint → build, on every PR and every push to `main`.
- [ ] Connect the repo to Cloudflare Pages: build command `npm run build`, output `dist/`, production branch `main`, previews for PRs. *(You: authorize Cloudflare's GitHub app.)*
- [ ] Optional: protect `main` so merging needs green CI.

**Done when** a placeholder page is live on the `*.pages.dev` URL and a test PR shows green CI and its own preview link.

## Phase 2 — Design system

- [ ] `src/styles/tokens.css`: colours for both themes, type scale, spacing and layout widths ([Appendix B](#appendix-b--design-tokens)).
- [ ] Fonts through Astro's Fonts API:
  - Instrument Serif (regular and italic) and Instrument Sans (400–600), Latin subset only.
  - Preload just the serif file the H1 uses.
  - Metric-matched fallback fonts, so text doesn't jump when the web fonts arrive.
- [ ] `src/styles/global.css`: reset, base typography, underlined link style, a clearly visible `:focus-visible` ring, selection colour, `prefers-reduced-motion` rules.
- [ ] Themes:
  - Follow the OS setting by default; a toggle button overrides it and remembers the choice.
  - A tiny inline script in `<head>` applies the theme before first paint, so the wrong theme never flashes.
- [ ] Components: `BaseLayout`, `SiteHeader` (desktop nav and a mobile "Menu" disclosure), `SectionHead`, `Eyebrow`, `FactsStrip`, `JobRow`, `ProjectCard`, `PostRow`, `TagList`, `Button` (solid and outline pills), `SiteFooter`.
- [ ] A `/styleguide` page (no-index, not in the sitemap) that shows every token and component in both themes.

**Done when** the styleguide looks right in both themes at 390 px and 1440 px, and every text colour pair meets 4.5:1.

## Phase 3 — Content model

- [ ] `src/content.config.ts` with Zod schemas for three collections:
  - `jobs`: one YAML file with an entry per role.
  - `projects`: one Markdown/MDX file per project. The frontmatter feeds the card; the body is the case study.
  - `posts`: MDX files with title, date, description, tags and `draft`.
- [ ] `src/site.config.ts`: name, headline, availability flag, email, social links, résumé path.
- [ ] Seed everything with the demo's placeholder content, so pages can be built before real content exists.
- [ ] Leave entries marked `draft: true` out of production builds.

**Done when** deleting a required field from any entry fails the build with a readable error.

## Phase 4 — Home page
Reference: [demos/1-editorial.png](demos/1-editorial.png) and [demos/1-editorial-mobile.png](demos/1-editorial-mobile.png).

- [ ] Header: wordmark, nav (Work, Projects, Writing, Contact), theme toggle and "Résumé" pill. On mobile, a "Menu" button opens an accessible disclosure.
- [ ] Hero: availability eyebrow (from config), serif H1 with italic accent words, intro, Email / GitHub / LinkedIn links.
- [ ] Facts strip: 4 columns on desktop, 2 × 2 on mobile.
- [ ] Experience: one row per job (dates · role and company · impact and tech), plus a résumé link.
- [ ] Selected projects:
  - Featured projects in `order`, in a 2-column grid.
  - Screenshots go through Astro's `<Image>`: AVIF/WebP, `srcset`, explicit dimensions, lazy-loaded below the fold.
- [ ] Writing: only rendered when there are published posts.
- [ ] Contact footer: "Let's talk" call to action, lightly obfuscated email, social links, colophon.
- [ ] Skip-to-content link, and section anchors with `scroll-margin-top`.

**Done when** the page matches the demo side by side at 1440 px and 390 px, has no horizontal scroll from 320 px up, and works with the keyboard alone.

## Phase 5 — Inner pages
None of these pages are in the demo. They're designed directly in the browser from the Phase 2 components.

- [ ] `/projects`: every non-draft project, featured first, then newest first.
- [ ] `/projects/[slug]`, the case-study template (P1):
  - Title, a meta row (year, role, stack, links) and a large screenshot.
  - Sections: Problem → My role → Approach → Outcome → What I'd do differently.
  - Previous/next project links.
  - Write-ups can land after launch; cards only link to case studies that exist.
- [ ] `/about` (P1): longer bio, how I work, skills grouped by category (no skill bars), optional photo.
- [ ] Résumé: `public/resume.pdf`, plus a `/resume` redirect so the public link never changes.
- [ ] A `404` page in the same style, linking home and to projects.

**Done when** every page is reachable from the nav or footer, and each one passes the same checks as the home page.

## Phase 6 — Quality pass

- [ ] **Accessibility**
  - A Playwright + `@axe-core/playwright` test runs over every page in both themes, with zero violations allowed (in CI).
  - Manual pass: keyboard only, VoiceOver on macOS and iOS, 200% zoom, reduced motion.
- [ ] **Performance**
  - Lighthouse CI (`@lhci/cli`) runs on the built site with the §6 budgets: ≥ 95 in every category on mobile, < 50 KB JavaScript, < 150 KB transfer excluding images.
  - Confirm the serif font isn't delaying the H1, which is likely the page's largest element (LCP).
- [ ] **SEO**
  - A `Seo` component for title, description, canonical URL and Open Graph/Twitter tags.
  - `@astrojs/sitemap` and `robots.txt`.
  - JSON-LD `Person` (name, job title, URL, profile links).
- [ ] **Share images:** a link-preview image per page, generated at build time (Satori + resvg in an Astro endpoint) in the site's style: paper background, serif title.
- [ ] **Links and markup:** a broken-link check (lychee) and HTML validation (html-validate) in CI.

**Done when** all of these run in CI, so any PR that regresses one of them fails.

## Phase 7 — Launch

- [ ] Replace the placeholder content with the real content from Phase 0.
- [ ] Search the repo for the demo names (Lumen Labs, Fieldnote, Brightwave, Tidewatch, gitpulse, Pantry, Margin) to make sure none are left.
- [ ] Domain:
  - Add it to Cloudflare and attach it to the Pages project.
  - Confirm HTTPS.
  - Redirect `www` → the bare domain.
- [ ] Turn on Cloudflare Web Analytics.
- [ ] Test on iOS Safari, Android Chrome, and desktop Chrome, Firefox and Safari.
- [ ] Check link previews (LinkedIn Post Inspector, and pasting the URL into Slack or iMessage).
- [ ] Tick every box in REQUIREMENTS §12, then tag the release `v1.0.0`.

**Done when** the §12 launch checklist is complete.

---

## After launch

- **P1:** case-study write-ups for each featured project; automated dependency updates (Renovate or Dependabot).
- **P2:**
  - Writing section, with an RSS feed.
  - `/now` and `/uses` pages.
  - Résumé PDF generated from the `jobs` data with a print stylesheet.
  - Project filters, and GitHub stars pulled in at build time.
  - ⌘K command palette and View Transitions.
  - Testimonials.
  - Contact form with Turnstile spam protection.
  - Uptime monitor.

## Target repo layout

```
website/
├── .github/workflows/ci.yml
├── demos/                       design references (unchanged)
├── public/
│   ├── favicon.svg
│   ├── resume.pdf
│   └── robots.txt
├── src/
│   ├── assets/projects/         screenshots, optimized at build time
│   ├── components/              SiteHeader, JobRow, ProjectCard, …
│   ├── content/
│   │   ├── jobs.yaml
│   │   ├── projects/*.md
│   │   └── posts/*.mdx
│   ├── layouts/BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── 404.astro
│   │   ├── styleguide.astro
│   │   ├── projects/index.astro
│   │   ├── projects/[slug].astro
│   │   └── og/[...slug].png.ts  share images
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── content.config.ts
│   └── site.config.ts
├── astro.config.mjs
├── package.json
├── README.md
├── REQUIREMENTS.md
└── WORKPLAN.md
```

## Risks

| Risk | Mitigation |
| --- | --- |
| Content takes longer than the build | Build on placeholders, treat content as the launch gate, and start writing in week 1. |
| Project screenshots are missing or inconsistent | Use the same 16:10 crop on a tinted backdrop for every project, as in the demo. |
| The serif font slows the first render or shifts the layout | Preload one file, `font-display: swap`, metric-matched fallback; Lighthouse CI watches LCP and CLS. |
| Instrument Serif comes in only one weight | Build hierarchy with size and italics; never fake bold. |
| Scope creep from P2 extras | Launch scope is fixed at the top of this plan; everything else goes to the backlog. |

---

## Appendix A — content templates

**A role** (`src/content/jobs.yaml`, newest first):

```yaml
- id: lumen-labs
  role: Senior Software Engineer
  company: Lumen Labs
  url: https://example.com
  start: 2023-03
  end: present            # or a month, e.g. 2023-01
  location: Remote        # Remote | Hybrid | On-site | a city
  summary: >-
    Lead engineer for checkout and payments. Cut p95 checkout latency by 40%
    and launched multi-currency pricing in 12 markets.
  tech: [TypeScript, Go, PostgreSQL, AWS]
```

**A project** (`src/content/projects/tidewatch.md`):

```markdown
---
title: Tidewatch
tagline: Surf and tide forecasts on one glanceable screen.
description: Built for my own dawn patrols; now checked by 3,000 surfers a month.
year: 2025
status: live              # live | in-progress | archived
featured: true
order: 1
tech: [SvelteKit, Cloudflare Workers]
links:
  live: https://example.com
  source: https://github.com/you/tidewatch
cover: ../../assets/projects/tidewatch.png
coverAlt: Tidewatch forecast screen showing wave height and a tide curve
draft: false
---

## Problem
…
```

## Appendix B — design tokens

Taken from [demos/1-editorial.png](demos/1-editorial.png). The dark theme wasn't mocked up, so its values are a proposal to review on the styleguide page.

**Colour**

| Token | Light | Dark | Used for | Contrast (light / dark) |
| --- | --- | --- | --- | --- |
| `--bg` | `#F5F2EB` | `#181612` | Page background | — |
| `--ink` | `#1C1A17` | `#EEE9DF` | Headings, emphasis | 15.5:1 / 14.9:1 |
| `--muted` | `#5E594F` | `#ADA697` | Body copy, descriptions | 6.2:1 / 7.5:1 |
| `--faint` | `#736D62` | `#8F887B` | Dates, tags, labels | 4.6:1 / 5.1:1 |
| `--accent` | `#AE3F19` | `#E8774A` | Italic hero words, call to action | 5.3:1 / 6.2:1 |
| `--rule` | `#E0DACC` | `#2F2B25` | Hairline dividers (decorative) | — |

**Type**

| Role | Font | Desktop | Mobile | Fluid size (390 → 1440 px) |
| --- | --- | --- | --- | --- |
| Display (H1) | Instrument Serif | 94 px, line-height 0.98 | 52 px | `clamp(3.25rem, 2.275rem + 4vw, 5.875rem)` |
| Footer call to action | Instrument Serif | 88 px | 54 px | `clamp(3.375rem, 2.586rem + 3.238vw, 5.5rem)` |
| Section title (H2) | Instrument Serif | 54 px | 40 px | `clamp(2.5rem, 2.175rem + 1.333vw, 3.375rem)` |
| Project title | Instrument Serif | 36 px | 32 px | |
| Post title | Instrument Serif | 31 px | 25 px | |
| Lede | Instrument Sans 400 | 20 px | 18 px | |
| Body | Instrument Sans 400 | 17 px | 16 px | |
| Role title | Instrument Sans 600 | 19 px | 19 px | |
| Dates, tags, labels | System monospace; labels uppercase, +0.08em tracking | 12–13.5 px | 11–13 px | |

**Layout**
- Content width: max 1120 px, including 40 px side padding (20 px below 760 px).
- Header height: 84 px (68 px on mobile).
- Space above each section: 104 px (76 px on mobile).
- Experience row columns: 190 px · 320 px · remaining width; stacked on mobile.
- Project grid: 2 columns with a 40 px column gap and 64 px row gap; 1 column on mobile.
- Project screenshots: 16:10 frames with a 4 px radius.
- Single breakpoint: 760 px.
