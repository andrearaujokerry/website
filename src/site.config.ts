// Site-wide settings and home-page copy. Jobs, projects and posts live in src/content/.
// Placeholder copy drawn from the October 2026 résumé; rewrite it in your own voice.

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  /** Short line above the headline. */
  role: string;
  /** City only; never a street address. */
  location: string;
  /** Home page headline. Wrap words in *asterisks* for the italic accent. */
  headline: string;
  /** Two or three sentences under the headline. */
  intro: string;
  /** The four-item strip under the intro. */
  facts: { label: string; value: string }[];
  /** Shown with a green dot when set, e.g. "Open to new roles". Leave unset to hide. */
  availability?: string;
  /** Kept in two parts so the full address never appears as plain text in the HTML. */
  email?: { user: string; domain: string };
  nav: NavItem[];
  links: {
    github?: string;
    linkedin?: string;
  };
  /** Public path of the résumé PDF, once it's added to /public (Phase 5). */
  resume?: string;
}

export const site: SiteConfig = {
  name: 'Andre Araujo-Kerry',
  role: 'Software & data engineer',
  location: 'Boston, MA',
  headline: 'I turn *messy data* into dashboards, pipelines and software people rely on.',
  intro:
    "I'm Andre, a Computer Science and Finance graduate from Northeastern University. At Annaly Capital Management and MFS Investment Management I built ETL pipelines, BI dashboards and data checks for financial data; on the side, I build LeadMe.",
  facts: [
    { label: 'Education', value: 'B.S. Computer Science & Finance, Northeastern ’26' },
    { label: 'Previously', value: 'Annaly Capital Management and MFS Investment Management' },
    { label: 'Focus', value: 'Data pipelines, business intelligence and full-stack work' },
    { label: 'On the side', value: 'LeadMe, plus data science projects' },
  ],
  email: { user: 'andre.araujo.kerry', domain: 'gmail.com' },
  nav: [
    { label: 'Work', href: '/#work' },
    { label: 'Projects', href: '/#projects' },
    { label: 'Contact', href: '/#contact' },
  ],
  links: {
    github: 'https://github.com/andrearaujokerry',
  },
};
