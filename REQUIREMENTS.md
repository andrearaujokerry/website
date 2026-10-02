# Personal website: requirements

A personal site that shows who I am, where I've worked and what I build on the side, and makes it easy to get in touch.

**Priorities:** **P0** = must have at launch · **P1** = should have, soon after · **P2** = nice to have.

Three design directions are mocked up in [`demos/`](demos/README.md).

---

## 1. Goals

1. A recruiter or hiring manager can tell my role, seniority and strengths **within 10 seconds** of landing.
2. A fellow engineer can browse side projects, understand each one, and open a live demo or the source in one click.
3. Anyone can contact me in **one click** from any page.
4. Adding a new job, project or post means **adding one content file**, with no code changes.
5. The site itself is evidence of craft: fast, accessible, and polished on every screen size.

## 2. Audiences

| Visitor | What they want | What the site must make easy |
| --- | --- | --- |
| Recruiter / hiring manager | Role, seniority, impact, availability | Scannable experience, résumé download, contact |
| Engineer / collaborator | What I build and how | Project details, source links, writing |
| Potential client (freelance) | Outcomes and trust | Case studies, testimonials, contact |

## 3. Content and sections

### 3.1 Home / hero (P0)
- Name, one-line headline (role + what I care about) and a 2–3 sentence intro.
- Primary call to action (**Contact**) and secondary (**Résumé**).
- Availability badge ("Open to new roles", "Not looking") driven by a single config flag. *(P1)*
- Photo or avatar. *(P1)*

### 3.2 Experience (P0)
- Reverse-chronological roles: title, company (linked), dates, remote/location, 1–3 impact statements with numbers, and the tech used.
- Multiple roles at the same company are grouped under it. *(P1)*
- Short education / certifications block. *(P1)*

### 3.3 Side projects (P0)
- One card per project: name, one-line description, screenshot or thumbnail, tech tags, status (live / in progress / archived), and links (live site, source, app store).
- A `featured` flag pins 3–4 projects on the home page; all projects are listed on `/projects`.
- A case-study page for featured projects: problem, my role, approach, outcome/metrics, screenshots, and what I'd do differently. *(P1)*
- Filter projects by tech or tag. *(P2)*
- GitHub stars and last-updated date pulled at build time. *(P2)*

### 3.4 About (P1)
- Longer bio, how I like to work, interests outside work, and what I'm looking for next.
- Skills grouped by category (languages, frameworks, infrastructure, tools). No percentage bars or "skill meters".

### 3.5 Résumé (P0)
- A downloadable PDF, linked from the header and the Experience section.
- Résumé generated from the same data as the Experience section, so the two never drift apart. *(P2)*
- Print stylesheet for the HTML version. *(P2)*

### 3.6 Contact (P0)
- Email, GitHub and LinkedIn are reachable from every page (header or footer).
- Email address lightly obfuscated against scrapers.
- Contact form with spam protection (honeypot or Cloudflare Turnstile). *(P2, only if a plain email link isn't enough)*

### 3.7 Writing (P2)
- Markdown posts with title, date, reading time and tags; syntax highlighting for code; RSS feed.

### 3.8 Extras (P2)
- `/now` page: what I'm focused on right now.
- `/uses` page: hardware, software and setup.
- Testimonials or short quotes from colleagues.
- GitHub contribution graph or recent activity.
- ⌘K command palette for keyboard navigation.
- Custom 404 page that links back home. *(P1 for a simple version)*

## 4. Design and UX
- **P0** Responsive from 320 px phones to wide desktops: no horizontal scrolling, tap targets ≥ 44 px.
- **P0** Readable typography: body text ≥ 16 px, line length ~60–75 characters, a clear heading hierarchy.
- **P0** Navigation is always reachable (sticky header or short page), with anchor links to home-page sections.
- **P1** Light and dark themes: follows the OS setting by default, with a manual toggle that persists.
- **P1** Restrained motion: hover states and page transitions (View Transitions API), all disabled under `prefers-reduced-motion`.
- **P1** Consistent identity: one accent colour, favicon and social share image, all from the same design tokens.

## 5. Accessibility (P0)
- WCAG 2.2 AA: text contrast ≥ 4.5:1, visible focus styles, full keyboard navigation, skip-to-content link.
- Semantic HTML: landmarks, headings in order, real lists and buttons, meaningful `alt` text on every image.
- Lighthouse Accessibility score of 100 and zero axe-core violations, checked in CI. *(P1)*

## 6. Performance (P0)
- Static HTML generated at build time. JavaScript only where it's needed (theme toggle, small islands).
- Core Web Vitals on mobile (p75): **LCP < 2.0 s**, **CLS < 0.05**, **INP < 200 ms**.
- Lighthouse ≥ 95 in all four categories on mobile.
- Home page budget, excluding images: **< 50 KB JavaScript**, **< 150 KB total transfer**.
- Images: responsive `srcset`, AVIF/WebP, lazy-loaded below the fold, explicit `width`/`height`.
- Fonts: self-hosted and subset, at most two families, `font-display: swap`.

## 7. SEO and sharing
- **P0** A unique `<title>` and meta description on every page, canonical URLs, `sitemap.xml`, `robots.txt`.
- **P1** Open Graph and Twitter/X card tags with an auto-generated share image per page.
- **P1** JSON-LD `Person` schema (name, job title, `sameAs` profile links).
- **P2** RSS/Atom feed for writing.

## 8. Content management
- **P0** All content lives in the repo as Markdown/MDX and YAML/JSON, for example `content/experience.yaml` and `content/projects/*.md`.
- **P0** Content is validated against a typed schema at build time, so a missing field fails the build instead of breaking production.
- **P1** A `draft` flag hides unfinished projects and posts from production builds.

## 9. Tech and hosting (recommendation)
- **Framework:** [Astro](https://astro.build). It outputs static HTML, ships zero JS by default and has typed content collections. Alternatives: Next.js (React everywhere) or Eleventy (simplest).
- **Styling:** plain CSS with custom properties (or Tailwind), using design tokens for colour, type and spacing.
- **Hosting:** Cloudflare Pages, Vercel, Netlify or GitHub Pages. All have a free tier with HTTPS and a preview deploy per pull request.
- **Domain:** a custom domain with HTTPS and a `www` → apex redirect.

## 10. Quality and operations
- **P0** CI on every pull request: type-check, lint, build.
- **P1** Broken-link check, HTML validation, and Lighthouse CI enforcing the budgets in §6.
- **P1** Privacy-friendly, cookie-free analytics (Plausible, Umami or Cloudflare Web Analytics), so no cookie banner is needed.
- **P2** Automated dependency updates (Renovate or Dependabot) and an uptime monitor.

## 11. Out of scope for v1
CMS or admin UI, user accounts, comments, newsletter, e-commerce, multiple languages.

## 12. Launch checklist (definition of done)
- [ ] Every P0 above is implemented.
- [ ] Real content is in place: bio, roles, at least 3 projects with screenshots, résumé PDF.
- [ ] Lighthouse ≥ 95 (mobile) and zero axe violations on every page.
- [ ] Tested on iOS Safari, Android Chrome and desktop Chrome, Firefox and Safari.
- [ ] Custom domain live with HTTPS, and the social share preview checked.

## 13. Open questions
1. Which design direction: [Editorial, Bento or Bold](demos/README.md), or a mix?
2. Real content: roles and impact numbers, projects (with screenshots), bio, photo, résumé PDF.
3. Domain name?
4. Should writing be live at launch, or added later?
5. Am I currently open to new roles? This drives the availability badge and the hero call to action.
