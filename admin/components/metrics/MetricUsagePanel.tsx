import type { ReactNode } from 'react';

import { Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { humanise } from '@admin/lib/metrics/model';
import { metricUsage, type ArchiveBlockers, type UsageDocument } from '@admin/lib/metrics/changes';

import { metricHref } from './MetricsList';

const sourceLabel = (source: UsageDocument['source']) => (source === 'database' ? 'Admin database' : 'Published snapshot');

/**
 * Where a metric appears: case studies, other documents, linked phrases and
 * formulas. Read from the same data as the archive check, so what is shown
 * here is exactly what keeps the metric from being archived. Editing never
 * changes these references.
 */
export function MetricUsagePanel({ blockers }: { blockers: ArchiveBlockers }) {
  const usage = metricUsage(blockers);
  const total = usage.caseStudies.length + usage.otherDocuments.length + usage.linkedPhrases.length + usage.formulas.length;

  if (total === 0) {
    return (
      <Surface className="p-3">
        <p className="text-sm text-ink-soft" role="status">
          Not referenced by any document, linked phrase or formula.
        </p>
      </Surface>
    );
  }

  return (
    <Surface className="divide-y divide-line">
      <Section title="Case studies" empty="No case study references.">
        {usage.caseStudies.map((ref) => (
          <DocumentItem key={`${ref.source}:${ref.slug}:${ref.fieldPath ?? ''}`} reference={ref} />
        ))}
      </Section>
      <Section title="Other documents" empty="No other document references.">
        {usage.otherDocuments.map((ref) => (
          <DocumentItem key={`${ref.source}:${ref.documentType}:${ref.slug}:${ref.fieldPath ?? ''}`} reference={ref} />
        ))}
      </Section>
      <Section title="Linked phrases" empty="No linked phrases.">
        {usage.linkedPhrases.map((phrase) => (
          <li key={`${phrase.source}:${phrase.location}:${phrase.phrase}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-ink">&ldquo;{phrase.phrase}&rdquo;</span>
            <span className="text-xs text-ink-soft">{phrase.location}</span>
            <StatusBadge>{sourceLabel(phrase.source)}</StatusBadge>
          </li>
        ))}
      </Section>
      <Section title="Formulas" empty="No formula reads this metric.">
        {usage.formulas.map((key) => (
          <li key={key}>
            <a href={metricHref(key)} className="font-mono text-xs font-semibold text-accent underline-offset-2 hover:underline">
              {key}
            </a>
          </li>
        ))}
      </Section>
    </Surface>
  );
}

function DocumentItem({ reference }: { reference: UsageDocument }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-medium text-ink">{reference.slug}</span>
      {reference.documentType !== 'case_study' ? <span className="text-xs text-ink-soft">{humanise(reference.documentType)}</span> : null}
      {reference.fieldPath ? <code className="text-xs text-ink-soft [overflow-wrap:anywhere]">{reference.fieldPath}</code> : null}
      <StatusBadge>{sourceLabel(reference.source)}</StatusBadge>
    </li>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section className="px-3 py-2 text-sm">
      <h3 className="text-xs font-semibold text-ink-soft">
        {title} <span className="font-normal text-ink-faint">({children.length})</span>
      </h3>
      {children.length > 0 ? <ul className="mt-1 space-y-1">{children}</ul> : <p className="mt-1 text-xs text-ink-faint">{empty}</p>}
    </section>
  );
}
