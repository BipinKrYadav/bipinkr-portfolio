'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

import { useAuth } from '@admin/components/auth/AuthProvider';
import { Panel, Surface } from '@admin/components/ui/Panel';
import { formatDateTime } from '@admin/lib/format-date';
import { verificationStateOf } from '@admin/lib/metrics/changes';
import type { DataError, DataResult } from '@admin/lib/metrics/errors';
import { describeFormula } from '@admin/lib/metrics/formula';
import { humanise, kindLabels, precisionLabels, unitLabel, type MetricRow } from '@admin/lib/metrics/model';
import type { MetricDetail } from '@admin/lib/metrics/repository';
import { displayValue, resolveValues } from '@admin/lib/metrics/values';

import { ArchivePanel } from './ArchivePanel';
import { EvidencePanel } from './EvidencePanel';
import { ActivityBadge, EvidenceStatusBadge, PublishedStateBadge, publishedStateLabels, VerificationBadge } from './MetricBadges';
import { MetricEditor } from './MetricEditor';
import { MetricUsagePanel } from './MetricUsagePanel';
import { useMetricsRepository } from './MetricsRepositoryProvider';
import { ReviewPanel } from './ReviewPanel';
import { ErrorMessage, LoadingMessage, SuccessMessage, UnavailableMessage } from './StateMessage';
import { VersionHistory } from './VersionHistory';

type DetailState = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; detail: MetricDetail };

export function MetricDetailView() {
  const metricKey = useSearchParams().get('key') ?? '';
  const repositoryState = useMetricsRepository();
  const { state: auth } = useAuth();
  const [detailState, setDetailState] = useState<DetailState>({ status: 'loading' });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const repository = repositoryState.status === 'ready' ? repositoryState.repository : null;

  const load = useCallback(async () => {
    if (!repository || !metricKey) return;
    const result = await repository.getMetricDetail(metricKey);
    setDetailState(result.ok ? { status: 'loaded', detail: result.data } : { status: 'error', error: result.error });
  }, [repository, metricKey]);

  useEffect(() => {
    setDetailState({ status: 'loading' });
    void load();
  }, [load]);

  /** Runs a mutation; on success reloads from the database (never patches local state by hand). */
  const mutate = useCallback(
    async (message: string, action: () => Promise<DataResult<MetricRow>>) => {
      setNotice(null);
      const result = await action();
      if (result.ok) {
        setNotice(message);
        await load();
      }
      return result;
    },
    [load],
  );

  const actorLabel = useCallback(
    (userId: string | null) => {
      if (!userId) return 'the system';
      if (auth.status === 'authenticated' && auth.identity.userId === userId) return auth.identity.email;
      return `user ${userId.slice(0, 8)}`;
    },
    [auth],
  );

  const detail = detailState.status === 'loaded' ? detailState.detail : null;
  const values = useMemo(() => (detail ? resolveValues(detail.metrics) : null), [detail]);
  const handleDirty = useCallback((value: boolean) => setDirty(value), []);

  const back = (
    <Link href="/metrics/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All metrics
    </Link>
  );

  if (!metricKey) {
    return (
      <>
        {back}
        <ErrorMessage error={{ kind: 'not_found', message: 'No metric was selected.' }} />
      </>
    );
  }
  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') {
    return (
      <>
        {back}
        <UnavailableMessage reason={repositoryState.reason} />
      </>
    );
  }
  if (detailState.status === 'loading') return <LoadingMessage label={`Loading ${metricKey}…`} />;
  if (detailState.status === 'error') {
    return (
      <>
        {back}
        <ErrorMessage error={detailState.error} />
      </>
    );
  }

  const repo = repositoryState.repository;
  const { metric } = detailState.detail;
  const loaded = detailState.detail;
  const currentValue = values?.get(metric.metric_key) ?? null;
  const reviewBlocked = metric.archived_at
    ? 'Archived metrics cannot be reviewed.'
    : dirty
      ? 'Save or discard your edits before changing the evidence status or confirming verification.'
      : null;

  return (
    <>
      {back}

      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-paper-raised px-2 py-1 font-mono text-sm font-semibold text-ink ring-1 ring-line">{metric.metric_key}</code>
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Key cannot be changed
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{metric.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">{metric.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActivityBadge archivedAt={metric.archived_at} />
          <EvidenceStatusBadge status={metric.evidence_status} />
          <VerificationBadge state={verificationStateOf(loaded.verification)} />
          <PublishedStateBadge state={loaded.published} />
        </div>
      </header>

      {notice ? <SuccessMessage title={notice} className="mb-6" /> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <Panel
            title="Edit metric"
            description="Fields the backend allows an admin to change. Every save needs a change summary, becomes a new draft version, and is recorded in the audit log. Nothing is published from here."
          >
            <Surface className="p-4">
              <MetricEditor
                detail={loaded}
                onDirtyChange={handleDirty}
                onSave={(draft, reason) =>
                  mutate('Draft saved as a new version. It is not published.', () => repo.saveMetric(loaded, draft, reason))
                }
              />
            </Surface>
          </Panel>

          <Panel title="Version history" description="Newest first. Recorded by the database; history cannot be edited or deleted.">
            <VersionHistory
              metric={metric}
              versions={loaded.versions}
              inPublishedSnapshot={loaded.published.state !== 'not_published'}
              actorLabel={actorLabel}
            />
          </Panel>
        </div>

        <aside className="min-w-0 space-y-8" aria-label="Metric review">
          <Panel title="Current figure">
            <Surface>
              <Facts
                items={[
                  ['Current value', <span key="value" className="font-semibold">{displayValue(metric, currentValue)}</span>],
                  ['Kind', kindLabels[metric.kind]],
                  ['Unit', unitLabel(metric.unit)],
                  ['Value type', humanise(metric.value_type)],
                  ['Precision', precisionLabels[metric.precision]],
                  ...(metric.kind === 'calculated'
                    ? ([['Formula', <code key="formula" className="text-xs [overflow-wrap:anywhere]">{describeFormula(metric.formula)}</code>]] as [string, ReactNode][])
                    : []),
                  ['State', metric.archived_at ? `Archived ${formatDateTime(metric.archived_at)}` : 'Active'],
                  ['Last updated', `${formatDateTime(metric.updated_at)} by ${actorLabel(metric.updated_by)}`],
                ]}
              />
              {metric.kind === 'calculated' ? (
                <p className="border-t border-line px-3 py-2 text-xs text-ink-faint">
                  Calculated from the current values of its inputs by the site&apos;s formula engine.
                </p>
              ) : null}
            </Surface>
          </Panel>

          <Panel title="Draft vs published" description="Compared with the published snapshot the live site is built from.">
            <Surface className="space-y-2 p-3 text-sm">
              <PublishedStateBadge state={loaded.published} />
              <p className="text-ink-soft">{publishedStateLabels[loaded.published.state].description}</p>
              {loaded.published.state === 'differs' ? (
                <p className="text-ink">
                  <span className="text-ink-soft">Differs in: </span>
                  {loaded.published.fields.map(humanise).join(', ')}
                </p>
              ) : null}
            </Surface>
          </Panel>

          <Panel title="Where it is used" description="Documents, linked phrases and formulas that reference this metric. Editing keeps every reference.">
            <MetricUsagePanel blockers={loaded.blockers} />
          </Panel>

          <Panel title="Review" description="Evidence status and verification are separate, recorded actions.">
            <Surface className="p-3">
              <ReviewPanel
                metric={metric}
                verification={loaded.verification}
                currentValue={currentValue}
                blockedReason={reviewBlocked}
                actorLabel={actorLabel}
                onSetStatus={(status, reason) => mutate('Evidence status updated', () => repo.setEvidenceStatus(metric, status, reason))}
                onConfirm={(note) => mutate('Verification recorded', () => repo.confirmVerification(metric, note))}
              />
            </Surface>
          </Panel>

          <Panel title="Evidence" description="Private files. Metadata only; files are never linked or displayed here.">
            <EvidencePanel metric={metric} evidence={loaded.evidence} actorLabel={actorLabel} />
          </Panel>

          <Panel title="Archive">
            <Surface className="p-3">
              <ArchivePanel
                detail={loaded}
                blockedReason={dirty ? 'Save or discard your edits before archiving.' : null}
                actorLabel={actorLabel}
                onArchive={(reason) => mutate('Metric archived', () => repo.archiveMetric(loaded, reason))}
              />
            </Surface>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Facts({ items }: { items: readonly [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {items.map(([term, detail]) => (
        <div key={term} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-3 py-2">
          <dt className="text-ink-soft">{term}</dt>
          <dd className="min-w-0 text-ink">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
