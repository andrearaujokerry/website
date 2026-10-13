// Site-wide settings shared by the layout, header and footer.
// Headline, availability and the content collections arrive in Phase 3.

export interface NavItem {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  nav: NavItem[];
  links: {
    email?: string;
    github?: string;
    linkedin?: string;
  };
  /** Public path of the résumé PDF, once it's added to /public (Phase 5). */
  resume?: string;
}

export const site: SiteConfig = {
  name: 'Andre Araujo-Kerry',
  nav: [
    { label: 'Work', href: '/#work' },
    { label: 'Projects', href: '/#projects' },
    { label: 'Contact', href: '/#contact' },
  ],
  links: {
    github: 'https://github.com/andrearaujokerry',
  },
};
