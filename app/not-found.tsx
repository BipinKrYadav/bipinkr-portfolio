import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { primaryNav } from '@/content/navigation';
import { notFoundContent } from '@/content/pages/legal';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Page not found',
  description: 'The page you were looking for does not exist on bipinkr.in.',
  path: '/404',
  noIndex: true,
});

export default function NotFound() {
  return (
    <section className="py-section">
      <Container>
        <div className="max-w-2xl">
          <p className="font-serif text-metric-lg tabular-nums text-ink-faint">
            {notFoundContent.code}
          </p>

          <h1 className="mt-6 font-serif text-display-lg text-ink">{notFoundContent.heading}</h1>

          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{notFoundContent.body}</p>

          <h2 className="mt-12 text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
            {notFoundContent.suggestionsHeading}
          </h2>

          <ul className="mt-4">
            {primaryNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex items-center justify-between border-b border-line py-3.5 text-base text-ink-soft transition-colors hover:text-ink"
                >
                  {link.label}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-line-strong transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <Button href="/" size="lg" className="mt-10">
            Back to the homepage
          </Button>
        </div>
      </Container>
    </section>
  );
}
