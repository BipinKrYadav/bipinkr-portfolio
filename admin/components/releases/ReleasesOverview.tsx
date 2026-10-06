'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import { ErrorMessage, LoadingMessage } from '@admin/components/metrics/StateMessage';
import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { Notice } from '@admin/components/ui/Notice';
import { DefinitionList, Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { formatDateTime } from '@admin/lib/format-date';
import type { DataError, DataResult } from '@admin/lib/metrics/errors';
import { releaseStatusLabels, type ReleaseRow } from '@admin/lib/releases/model';
import type { ReleasesOverview as Overview } from '@admin/lib/releases/repository';

import { releaseHref, releaseName, ReleaseStatusBadge } from './ReleaseBadges';
import { useReleasesRepository } from './ReleasesRepositoryProvider';

type State = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; overview: Overview };

const changeLabels = { added: 'Added', changed: 'Changed', removed: 'Removed' } as const;
const entityLabels = { metric: 'Metric', document: 'Document', linked_phrases: 'Linked phrases' } as const;

/** The central publishing area: what is live, what is waiting, and every release so far. */
export function ReleasesOverview() {
  const repositoryState = useReleasesRepository();
  const repository = repositoryState.status === 'ready' ? repositoryState.repository : null;
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    if (!repository) return;
    const result = await repository.getOverview();
    setState(result.ok ? { status: 'loaded', overview: result.data } : { status: 'error', error: result.error });
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') {
    return (
      <Notice tone="warning" title="No release data available">
        {repositoryState.reason} Nothing is shown until an MFA-verified admin session can read the database.
      </Notice>
    );
  }
  if (state.status === 'loading') return <LoadingMessage label="Loading releases…" />;
  if (state.status === 'error') return <ErrorMessage error={state.error} />;

  const { overview } = state;
  const repo = repositoryState.repository;

  return (
    <div className="space-y-8">
      <Notice tone="info" title="Saving a draft never publishes">
        Edits on the Metrics and Documents screens stay drafts. Only a release that has been validated, reviewed,
        approved, built, verified and confirmed as deployed becomes the published baseline. The admin does not deploy:
        the build and the upload happen on your machine, and this screen records each step.
      </Notice>

      {overview.open ? (
        <Notice tone="warning" title={`${releaseName(overview.open)} is open: ${releaseStatusLabels[overview.open.status].label}`}>
          <p>{releaseStatusLabels[overview.open.status].description}</p>
          <Link href={releaseHref(overview.open.id)} className="mt-1 inline-block font-semibold text-accent hover:underline">
            Continue with {releaseName(overview.open)}
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-2">
        <PublishedPanel overview={overview} />
        <ChangesPanel overview={overview} onCreate={(summary) => repo.createRelease(summary)} />
      </div>

      <RollbackPanel overview={overview} onCreate={(summary) => repo.createRollbackRelease(summary)} />

      <Panel title="Release history" description="Newest first. Releases are never deleted.">
        <HistoryTable releases={overview.releases} />
      </Panel>
    </div>
  );
}

function PublishedPanel({ overview }: { overview: Overview }) {
  const { published, lastPublished, recentFailure } = overview;
  return (
    <Panel title="Published release" description="What the live site is built from: the published baseline.">
      {published ? (
        <Surface>
          <DefinitionList
            items={[
              { term: 'Release', detail: <Link href={releaseHref(published.id)} className="font-semibold text-accent hover:underline">{releaseName(published)}</Link> },
              { term: 'Summary', detail: published.summary },
              { term: 'Published', detail: published.live_at ? formatDateTime(published.live_at) : '—' },
              { term: 'Snapshot SHA-256', detail: <code className="break-all text-xs">{published.snapshot_sha256}</code> },
              {
                term: 'Last successful publish',
                detail: lastPublished?.live_at ? `${releaseName(lastPublished)}, ${formatDateTime(lastPublished.live_at)}` : '—',
              },
              {
                term: 'Failed publish',
                detail: recentFailure ? (
                  <Link href={releaseHref(recentFailure.id)} className="font-semibold text-evidence-limitation hover:underline">
                    {releaseName(recentFailure)} failed at {recentFailure.failure_stage}
                  </Link>
                ) : (
                  'None since the last publish'
                ),
              },
            ]}
          />
        </Surface>
      ) : (
        <Notice tone="warning" title="No release is recorded as published">
          Import the published baseline (supabase/imports/release_baseline.sql) once, as the database owner. Until then no
          release can be created, and the Metrics screen compares drafts with the snapshot this admin build was made from.
        </Notice>
      )}
    </Panel>
  );
}

function ChangesPanel({ overview, onCreate }: { overview: Overview; onCreate: (summary: string) => Promise<DataResult<ReleaseRow>> }) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const { items } = overview.preview;
  const blocked = !overview.published
    ? 'No published release exists yet.'
    : overview.open
      ? `${releaseName(overview.open)} is still open.`
      : items.length === 0
        ? 'There are no draft changes to release.'
        : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !summary.trim()) return;
    setBusy(true);
    setError(null);
    const created = await onCreate(summary);
    setBusy(false);
    if (created.ok) router.push(releaseHref(created.data.id));
    else setError(created.error);
  }

  return (
    <Panel title="Unpublished draft changes" description="Drafts that differ from the published baseline right now.">
      <Surface className="space-y-4 p-4">
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft" role="status">
            No draft differs from the published release.
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {items.map((item) => (
              <li key={`${item.entityType}:${item.entityKey}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 py-1.5">
                <StatusBadge tone={item.change === 'changed' ? 'info' : 'warning'}>{changeLabels[item.change]}</StatusBadge>
                <span className="text-xs text-ink-soft">{entityLabels[item.entityType]}</span>
                <code className="text-xs font-semibold [overflow-wrap:anywhere]">{item.entityKey}</code>
                <span className="text-xs text-ink-faint">
                  {item.fields.length} field{item.fields.length === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-line pt-3" aria-label="Create release">
          <Field
            id="release-summary"
            label="Release summary"
            required
            hint="Creating a release freezes every change above into one snapshot. It publishes nothing."
          >
            <textarea
              id="release-summary"
              rows={2}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={busy || !!blocked}
              className={inputClass}
            />
          </Field>
          {blocked ? <p className="text-xs text-ink-soft">{blocked}</p> : null}
          {error ? <ErrorMessage error={error} /> : null}
          <button type="submit" disabled={busy || !!blocked || !summary.trim()} className={buttonClass.primary}>
            {busy ? 'Creating…' : 'Create release'}
          </button>
        </form>
      </Surface>
    </Panel>
  );
}

function RollbackPanel({ overview, onCreate }: { overview: Overview; onCreate: (summary: string) => Promise<DataResult<ReleaseRow>> }) {
  const router = useRouter();
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const { published, open } = overview;
  if (!published) return null;

  const blocked = open
    ? `${releaseName(open)} is still open.`
    : !published.previous_release_id
      ? 'The published release has no earlier published state to return to.'
      : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || !summary.trim()) return;
    setBusy(true);
    setError(null);
    const created = await onCreate(summary);
    setBusy(false);
    if (created.ok) router.push(releaseHref(created.data.id));
    else setError(created.error);
  }

  return (
    <Panel
      title="Roll back"
      description="A deliberate action. It creates a rollback release that restores the previous published state; drafts are not changed."
    >
      <Surface className="p-4">
        <form onSubmit={submit} className="space-y-3" aria-label="Create rollback release">
          <Field id="rollback-summary" label={`Why roll back ${releaseName(published)}?`} required>
            <textarea
              id="rollback-summary"
              rows={2}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={busy || !!blocked}
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-ink-soft">
            The rollback release goes through the same validation, review, approval, build and deployment confirmation as
            any other release. Nothing changes on the live site until you deploy its build.
          </p>
          {blocked ? <p className="text-xs text-ink-soft">{blocked}</p> : null}
          {error ? <ErrorMessage error={error} /> : null}
          <button type="submit" disabled={busy || !!blocked || !summary.trim()} className={buttonClass.danger}>
            {busy ? 'Creating…' : 'Create rollback release'}
          </button>
        </form>
      </Surface>
    </Panel>
  );
}

function HistoryTable({ releases }: { releases: readonly ReleaseRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-paper-raised">
      <table className="w-full min-w-[48rem] border-collapse text-left text-[0.8125rem]">
        <caption className="sr-only">Release history</caption>
        <thead>
          <tr className="border-b border-line bg-paper-sunk text-xs text-ink-soft">
            {['Release', 'State', 'Summary', 'Created', 'Published'].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {releases.map((release) => (
            <tr key={release.id} className="border-b border-line align-top last:border-b-0 hover:bg-paper">
              <td className="whitespace-nowrap px-3 py-2">
                <Link href={releaseHref(release.id)} className="font-semibold text-accent underline-offset-2 hover:underline">
                  {releaseName(release)}
                </Link>
              </td>
              <td className="px-3 py-2">
                <ReleaseStatusBadge status={release.status} />
              </td>
              <td className="px-3 py-2 [overflow-wrap:anywhere]">{release.summary}</td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{formatDateTime(release.created_at)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{release.live_at ? formatDateTime(release.live_at) : '—'}</td>
            </tr>
          ))}
          {releases.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft" role="status">
                No releases yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
