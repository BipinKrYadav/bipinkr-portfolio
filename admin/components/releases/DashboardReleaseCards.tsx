'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';

import { formatDateTime } from '@admin/lib/format-date';
import type { DataError } from '@admin/lib/metrics/errors';
import { releaseStatusLabels } from '@admin/lib/releases/model';
import type { ReleasesOverview } from '@admin/lib/releases/repository';

import { releaseHref, releaseName } from './ReleaseBadges';
import { useReleasesRepository } from './ReleasesRepositoryProvider';

type State = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; overview: ReleasesOverview };

/** Release cards on the dashboard, read from the database after sign-in. Nothing here is built into the page. */
export function DashboardReleaseCards() {
  const repositoryState = useReleasesRepository();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (repositoryState.status !== 'ready') return;
    let active = true;
    void repositoryState.repository.getOverview().then((result) => {
      if (active) setState(result.ok ? { status: 'loaded', overview: result.data } : { status: 'error', error: result.error });
    });
    return () => {
      active = false;
    };
  }, [repositoryState]);

  const reason =
    repositoryState.status === 'unavailable'
      ? repositoryState.reason
      : repositoryState.status === 'loading' || state.status === 'loading'
        ? 'Loading…'
        : state.status === 'error'
          ? state.error.message
          : null;
  const overview = state.status === 'loaded' ? state.overview : null;
  const awaiting = overview?.open && overview.open.status !== 'publishing' ? overview.open : null;
  const publishing = overview?.open?.status === 'publishing' ? overview.open : null;

  return (
    <>
      <Card label="Published release" description="The release the live site is built from (the published baseline)." reason={reason}>
        {overview ? (
          overview.published ? (
            <Link href={releaseHref(overview.published.id)} className="hover:underline">
              {releaseName(overview.published)}
            </Link>
          ) : (
            <span className="text-base">None recorded</span>
          )
        ) : null}
      </Card>
      <Card label="Draft changes" description="Metrics and documents that differ from the published release." reason={reason}>
        {overview ? (
          <Link href="/releases/" className="hover:underline">
            {overview.preview.items.length}
          </Link>
        ) : null}
      </Card>
      <Card label="Releases awaiting review" description="A release that is created, validated or approved but not publishing yet." reason={reason}>
        {overview ? (
          awaiting ? (
            <Link href={releaseHref(awaiting.id)} className="hover:underline">
              {releaseName(awaiting)}: {releaseStatusLabels[awaiting.status].label}
            </Link>
          ) : publishing ? (
            <Link href={releaseHref(publishing.id)} className="text-base hover:underline">
              {releaseName(publishing)} is publishing
            </Link>
          ) : (
            '0'
          )
        ) : null}
      </Card>
      <Card label="Last successful publish" description="When the most recent release was marked published." reason={reason}>
        {overview ? (
          overview.lastPublished?.live_at ? (
            <span className="text-base">{formatDateTime(overview.lastPublished.live_at)}</span>
          ) : (
            <span className="text-base">None yet</span>
          )
        ) : null}
      </Card>
      <Card label="Failed publish" description="A release that failed after the last successful publish. The live site was not changed." reason={reason}>
        {overview ? (
          overview.recentFailure ? (
            <Link href={releaseHref(overview.recentFailure.id)} className="text-base text-evidence-limitation hover:underline">
              {releaseName(overview.recentFailure)} ({overview.recentFailure.failure_stage})
            </Link>
          ) : (
            <span className="text-base">None</span>
          )
        ) : null}
      </Card>
    </>
  );
}

function Card({ label, description, reason, children }: { label: string; description: string; reason: string | null; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col rounded-card border border-line bg-paper-raised p-4">
      <h2 id={headingId} className="text-xs font-semibold text-ink-soft">
        {label}
      </h2>
      {reason ? (
        <>
          <p className="mt-2 text-2xl font-semibold leading-none text-line-strong" aria-hidden="true">
            —
          </p>
          <p role="status" className="mt-2 text-xs font-medium text-ink-faint">
            {reason}
          </p>
        </>
      ) : (
        <p className="mt-2 text-2xl font-semibold leading-tight text-ink [overflow-wrap:anywhere]">{children}</p>
      )}
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">{description}</p>
    </section>
  );
}
