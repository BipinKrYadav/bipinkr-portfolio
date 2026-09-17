import {
  BookOpen,
  ChartColumn,
  FileText,
  FolderLock,
  LayoutDashboard,
  PackageCheck,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const navigation: readonly NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    description: 'Releases, items waiting for review and recent admin activity.',
    icon: LayoutDashboard,
  },
  {
    href: '/metrics/',
    label: 'Metrics',
    description: 'Canonical figures, their evidence status and verification record.',
    icon: ChartColumn,
  },
  {
    href: '/content/',
    label: 'Documents / Content',
    description: 'Page documents that the public site is built from.',
    icon: FileText,
  },
  {
    href: '/case-studies/',
    label: 'Case Studies',
    description: 'The published case studies and their documents.',
    icon: BookOpen,
  },
  {
    href: '/media-evidence/',
    label: 'Media & Evidence',
    description: 'Media originals, private evidence files and their links to metrics.',
    icon: FolderLock,
  },
  {
    href: '/releases/',
    label: 'Releases',
    description: 'Release lifecycle and history.',
    icon: PackageCheck,
  },
  {
    href: '/audit-log/',
    label: 'Audit Log',
    description: 'Append-only record of admin changes.',
    icon: ScrollText,
  },
  {
    href: '/settings/',
    label: 'Settings',
    description: 'Admin account, authentication, security and site settings.',
    icon: Settings,
  },
];

const withoutTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

export function isActive(pathname: string, href: string): boolean {
  const current = withoutTrailingSlash(pathname);
  const target = withoutTrailingSlash(href);
  return target === '/' ? current === '/' : current === target || current.startsWith(`${target}/`);
}

export function currentSection(pathname: string): NavItem | undefined {
  return navigation.find((item) => isActive(pathname, item.href));
}
