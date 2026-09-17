'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { inputClass } from '@admin/components/ui/Field';
import { verificationStateOf } from '@admin/lib/metrics/changes';
import type { DataError } from '@admin/lib/metrics/errors';
import { kindLabels, METRIC_KINDS, precisionLabels, unitLabel, type MetricKind } from '@admin/lib/metrics/model';
import type { MetricsOverview } from '@admin/lib/metrics/repository';
import { displayValue, resolveValues } from '@admin/lib/metrics/values';
import { formatDateTime } from '@admin/lib/format-date';

import { ActivityBadge, EvidenceStatusBadge, VerificationBadge } from './MetricBadges';
import { useMetricsRepository } from './MetricsRepositoryProvider';
import { ErrorMessage, LoadingMessage, UnavailableMessage } from './StateMessage';

type ListState = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; overview: MetricsOverview };

type Activity = 'active' | 'archived' | 'all';
type Review = 'all' | 'needs_review';

export const metricHref = (key: string) => `/metrics/detail/?key=${encodeURIComponent(key)}`;

export function MetricsList() {
  const repositoryState = useMetricsRepository();
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<MetricKind | 'all'>('all');
  const [activity, setActivity] = useState<Activity>('active');
  const [review, setReview] = useState<Review>('all');

  useEffect(() => {
    if (repositoryState.status !== 'ready') return;
    let active = true;
    setList({ status: 'loading' });
    repositoryState.repository.listMetrics().then((result) => {
      if (!active) return;
      setList(result.ok ? { status: 'loaded', overview: result.data } : { status: 'error', error: result.error });
    });
    return () => {
      active = false;
    };
  }, [repositoryState]);

  const overview = list.status === 'loaded' ? list.overview : null;
  const metrics = overview?.metrics ?? null;
  const stateOf = (metricId: string) => verificationStateOf(overview?.verification[metricId]);
  const values = useMemo(() => (metrics ? resolveValues(metrics) : new Map<string, number | null>()), [metrics]);

  const visible = useMemo(() => {
    if (!metrics) return [];
    const query = search.trim().toLowerCase();
    return metrics.filter((metric) => {
      if (query && !metric.metric_key.includes(query) && !metric.name.toLowerCase().includes(query)) return false;
      if (kind !== 'all' && metric.kind !== kind) return false;
      if (activity === 'active' && metric.archived_at) return false;
      if (activity === 'archived' && !metric.archived_at) return false;
      if (
        review === 'needs_review' &&
        metric.evidence_status !== null &&
        verificationStateOf(overview?.verification[metric.id]) === 'verified_current'
      ) {
        return false;
      }
      return true;
    });
    }, [metrics, overview, search, kind, activity, review]);

  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') return <UnavailableMessage reason={repositoryState.reason} />;
  if (list.status === 'loading') return <LoadingMessage label="Loading metrics…" />;
  if (list.status === 'error') return <ErrorMessage error={list.error} />;

  const all = list.overview.metrics;
  const filtersDisabled = all.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filter metrics">
        <label className="flex flex-col text-xs font-semibold text-ink-soft">
          Search
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Key or name"
            disabled={filtersDisabled}
            className={`${inputClass} mt-1 w-64`}
          />
        </label>
        <label className="flex flex-col text-xs font-semibold text-ink-soft">
          Kind
          <select value={kind} onChange={(event) => setKind(event.target.value as MetricKind | 'all')} disabled={filtersDisabled} className={`${inputClass} mt-1`}>
            <option value="all">All kinds</option>
            {METRIC_KINDS.map((value) => (
              <option key={value} value={value}>
                {kindLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-ink-soft">
          State
          <select value={activity} onChange={(event) => setActivity(event.target.value as Activity)} disabled={filtersDisabled} className={`${inputClass} mt-1`}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">Active and archived</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-ink-soft">
          Review
          <select value={review} onChange={(event) => setReview(event.target.value as Review)} disabled={filtersDisabled} className={`${inputClass} mt-1`}>
            <option value="all">All metrics</option>
            <option value="needs_review">Needs review</option>
          </select>
        </label>
        <p role="status" className="ml-auto text-xs text-ink-soft">
          {all.length === 0 ? 'No metrics' : `Showing ${visible.length} of ${all.length}`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-paper-raised">
        <table className="w-full min-w-[64rem] border-collapse text-left text-[0.8125rem]">
          <caption className="sr-only">Metrics</caption>
          <thead>
            <tr className="border-b border-line bg-paper-sunk text-xs text-ink-soft">
              {['Metric key', 'Value', 'Kind', 'Unit', 'Precision', 'Verification status', 'Evidence status', 'Last updated', 'State'].map(
                (label) => (
                  <th key={label} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${label === 'Value' ? 'text-right' : ''}`}>
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((metric) => (
              <tr key={metric.id} className="border-b border-line align-top last:border-b-0 hover:bg-paper">
                <td className="px-3 py-2">
                  <Link href={metricHref(metric.metric_key)} className="font-mono text-xs font-semibold text-accent underline-offset-2 hover:underline">
                    {metric.metric_key}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-soft">{metric.name}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {displayValue(metric, values.get(metric.metric_key) ?? null)}
                  {metric.kind === 'calculated' ? <p className="text-[0.6875rem] text-ink-faint">calculated</p> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{kindLabels[metric.kind]}</td>
                <td className="whitespace-nowrap px-3 py-2">{unitLabel(metric.unit)}</td>
                <td className="whitespace-nowrap px-3 py-2">{precisionLabels[metric.precision]}</td>
                <td className="px-3 py-2">
                  <VerificationBadge state={stateOf(metric.id)} />
                </td>
                <td className="px-3 py-2">
                  <EvidenceStatusBadge status={metric.evidence_status} />
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{formatDateTime(metric.updated_at)}</td>
                <td className="px-3 py-2">
                  <ActivityBadge archivedAt={metric.archived_at} />
                </td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-soft" role="status">
                  {all.length === 0 ? 'The database has no metrics yet.' : 'No metrics match these filters.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
