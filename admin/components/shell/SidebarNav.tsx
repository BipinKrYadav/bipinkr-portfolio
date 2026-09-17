import Link from 'next/link';

import { cn } from '@admin/lib/cn';
import { isActive, navigation } from '@admin/lib/navigation';

export function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Admin sections" className="p-2">
      <ul className="space-y-0.5">
        {navigation.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
                  active
                    ? 'bg-night-raised text-white shadow-[inset_2px_0_0_#7FC6BC]'
                    : 'text-[#C9CDD3] hover:bg-night-raised hover:text-white',
                )}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
