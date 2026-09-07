export interface NavLink {
  href: string;
  label: string;
}

/** Desktop primary navigation. */
export const primaryNav: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/** Mobile navigation adds Resume, per the brief. */
export const mobileNav: NavLink[] = [...primaryNav, { href: '/resume', label: 'Resume' }];

/** Footer link column. */
export const footerNav: NavLink[] = [
  { href: '/case-studies', label: 'Case Studies' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/resume', label: 'Resume' },
];

export const legalNav: NavLink[] = [
  { href: '/how-this-site-is-tracked', label: 'How this site is tracked' },
  { href: '/privacy', label: 'Privacy' },
];

/** The single primary call to action used across the entire site. */
export const PRIMARY_CTA = {
  label: 'Get a Free Ad Audit',
  href: '/contact',
} as const;

export const SECONDARY_CTA = {
  label: 'Chat on WhatsApp',
} as const;
