import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** The final crumb is the current page and is not a link. */
  current: string;
}

export function Breadcrumbs({ items, current }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink-faint">
        {items.map((item) => (
          <li key={item.path} className="flex items-center gap-1.5">
            <Link
              href={item.path}
              className="rounded-sm underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {item.name}
            </Link>
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-line-strong" />
          </li>
        ))}
        <li className="truncate font-medium text-ink-soft" aria-current="page">
          {current}
        </li>
      </ol>
    </nav>
  );
}
