import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Container } from '@/components/ui/Container';
import { MetricGrid } from '@/components/data/MetricCard';
import type { Metric } from '@/content/types';

interface CaseStudyHeroProps {
  title: string;
  subtitle: string;
  industry: string;
  platform: string;
  metrics: Metric[];
  /** Optional short scope line, e.g. market or client type. */
  scope?: string;
}

export function CaseStudyHero({
  title,
  subtitle,
  industry,
  platform,
  metrics,
  scope,
}: CaseStudyHeroProps) {
  return (
    <header className="border-b border-line bg-paper-sunk pb-section-sm pt-8">
      <Container>
        <Breadcrumbs
          items={[
            { name: 'Home', path: '/' },
            { name: 'Case Studies', path: '/case-studies' },
          ]}
          current={title}
        />

        <div className="mt-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro uppercase tracking-[0.11em] text-ink-faint">
            <span>{industry}</span>
            <span aria-hidden="true" className="text-line-strong">
              ·
            </span>
            <span>{platform}</span>
            {scope ? (
              <>
                <span aria-hidden="true" className="text-line-strong">
                  ·
                </span>
                <span>{scope}</span>
              </>
            ) : null}
          </div>

          <h1 className="mt-5 font-serif text-display-lg text-ink">{title}</h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{subtitle}</p>
        </div>

        <MetricGrid metrics={metrics} columns={4} size="md" className="mt-12" />
      </Container>
    </header>
  );
}
