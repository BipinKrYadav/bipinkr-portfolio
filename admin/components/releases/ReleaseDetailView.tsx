'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Circle, Download } from 'lucide-react';

import { useAuth } from '@admin/components/auth/AuthProvider';
import { ErrorMessage, LoadingMessage, SuccessMessage } from '@admin/components/metrics/StateMessage';
import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { Notice } from '@admin/components/ui/Notice';
import { DefinitionList, Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { formatDateTime } from '@admin/lib/format-date';
import type { DataError, DataResult } from '@admin/lib/metrics/errors';
import {
  completedStep,
  FAILURE_STAGES,
  PUBLISH_STEPS,
  releaseStatusLabels,
  type FailureStage,
  type ReleaseRow,
} from '@admin/lib/releases/model';
import type { ReleaseDetail, ReleasesRepository } from '@admin/lib/releases/repository';
import { displayValue, type FieldChange } from '@admin/lib/releases/review';

import { releaseHref, releaseName, ReleaseStatusBadge } from './ReleaseBadges';
import { useReleasesRepository } from './ReleasesRepositoryProvider';

type State = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; detail: ReleaseDetail };

export function ReleaseDetailView() {
  const releaseId = Number(useSearchParams().get('id') ?? '');
  const repositoryState = useReleasesRepository();
  const repository = repositoryState.status === 'ready' ? repositoryState.repository : null;
  const { state: auth } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!repository) return;
    const result = await repository.getReleaseDetail(releaseId);
    setState(result.ok ? { status: 'loaded', detail: result.data } : { status: 'error', error: result.error });
  }, [repository, releaseId]);

  useEffect(() => {
    setState({ status: 'loading' });
    void load();
  }, [load]);

  /** Runs one release action; on success reloads from the database. */
  const act = useCallback(
    async (message: string, action: () => Promise<DataResult<unknown>>) => {
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

  const back = (
    <Link href="/releases/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All releases
    </Link>
  );

  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') {
    return (
      <>
        {back}
        <Notice tone="warning" title="No release data available">
          {repositoryState.reason}
        </Notice>
      </>
    );
  }
  if (state.status === 'loading') return <LoadingMessage label="Loading release…" />;
  if (state.status === 'error') {
    return (
      <>
        {back}
        <ErrorMessage error={state.error} />
      </>
    );
  }

  const { detail } = state;
  const { release } = detail;
  const repo = repositoryState.repository;

  return (
    <>
      {back}
      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{releaseName(release)}</h1>
          <ReleaseStatusBadge status={release.status} />
          {release.kind === 'rollback' ? <StatusBadge tone="warning">Rollback</StatusBadge> : null}
        </div>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">{release.summary}</p>
        <p className="mt-1 text-xs text-ink-faint">{releaseStatusLabels[release.status].description}</p>
      </header>

      {notice ? <SuccessMessage title={notice} className="mb-6" /> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          <StepTracker release={release} />
          <ValidationPanel detail={detail} />
          <ReviewPanel detail={detail} />
        </div>
        <aside className="min-w-0 space-y-8" aria-label="Release actions">
          <Panel title="Actions">
            <Surface className="p-3">
              <Actions detail={detail} repo={repo} act={act} />
            </Surface>
          </Panel>
          <Panel title="Record">
            <Surface>
              <DefinitionList
                layout="inline"
                items={[
                  { term: 'Release ID', detail: String(release.id) },
                  { term: 'Kind', detail: release.origin === 'baseline_import' ? 'Imported baseline' : release.kind },
                  { term: 'Created', detail: `${formatDateTime(release.created_at)} by ${actorLabel(release.created_by)}` },
                  {
                    term: 'Compared with',
                    detail: detail.base ? <Link href={releaseHref(detail.base.id)} className="text-accent hover:underline">{releaseName(detail.base)}</Link> : '—',
                  },
                  ...(release.restores_release_id
                    ? [{ term: 'Restores', detail: <Link href={releaseHref(release.restores_release_id)} className="text-accent hover:underline">Release {release.restores_release_id}</Link> }]
                    : []),
                  ...(release.previous_release_id
                    ? [{ term: 'Previous published', detail: <Link href={releaseHref(release.previous_release_id)} className="text-accent hover:underline">Release {release.previous_release_id}</Link> }]
                    : []),
                  { term: 'Validated', detail: release.validated_at ? `${formatDateTime(release.validated_at)} by ${actorLabel(release.validated_by)}` : '—' },
                  { term: 'Approved', detail: release.approved_at ? `${formatDateTime(release.approved_at)} by ${actorLabel(release.approved_by)}` : '—' },
                  { term: 'Publish started', detail: release.publish_started_at ? formatDateTime(release.publish_started_at) : '—' },
                  { term: 'Build recorded', detail: release.built_at ? formatDateTime(release.built_at) : '—' },
                  {
                    term: 'Deployment confirmed',
                    detail: release.deployment_confirmed_at
                      ? `${formatDateTime(release.deployment_confirmed_at)} by ${actorLabel(release.deployment_confirmed_by)} (manual)`
                      : '—',
                  },
                  { term: 'Published', detail: release.live_at ? formatDateTime(release.live_at) : '—' },
                  ...(release.failed_at
                    ? [{ term: 'Failed', detail: `${formatDateTime(release.failed_at)} at ${release.failure_stage}: ${release.failure_message}` }]
                    : []),
                  ...(release.cancelled_at ? [{ term: 'Cancelled', detail: `${formatDateTime(release.cancelled_at)}: ${release.cancel_reason}` }] : []),
                ]}
              />
              <div className="border-t border-line px-4 py-2.5 text-xs">
                <p className="text-ink-soft">Snapshot SHA-256</p>
                <code className="break-all text-ink">{release.snapshot_sha256}</code>
                {release.build_sha256 ? (
                  <>
                    <p className="mt-2 text-ink-soft">Verified build SHA-256</p>
                    <code className="break-all text-ink">{release.build_sha256}</code>
                  </>
                ) : null}
              </div>
            </Surface>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function StepTracker({ release }: { release: ReleaseRow }) {
  const done = PUBLISH_STEPS.findIndex((step) => step.key === completedStep(release));
  const stopped = release.status === 'failed' || release.status === 'cancelled';
  return (
    <Panel title="Publishing sequence" description="Every step is a separate, recorded action. None is skipped.">
      <Surface>
        <ol className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0">
          {PUBLISH_STEPS.map((step, index) => {
            const complete = index <= done;
            const current = !stopped && index === done + 1;
            return (
              <li key={step.key} className="flex gap-2 px-4 py-2.5 text-sm">
                {complete ? (
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <Circle aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${current ? 'text-evidence-reported' : 'text-line-strong'}`} />
                )}
                <div className="min-w-0">
                  <p className={`font-semibold ${complete ? 'text-ink' : current ? 'text-evidence-reported' : 'text-ink-faint'}`}>
                    {index + 1}. {step.label}
                    <span className="sr-only">{complete ? ' (done)' : current ? ' (next)' : ''}</span>
                  </p>
                  <p className="text-xs text-ink-soft">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
        {stopped ? (
          <p className="border-t border-line px-4 py-2 text-xs text-ink-soft">
            This release {release.status === 'failed' ? 'failed' : 'was cancelled'}; the published release was not changed.
          </p>
        ) : null}
      </Surface>
    </Panel>
  );
}

function ValidationPanel({ detail }: { detail: ReleaseDetail }) {
  const { release, schemaIssues } = detail;
  const report = release.validation;
  return (
    <Panel title="Validation" description="Recorded by the database. Any failed check blocks publishing.">
      <Surface className="space-y-3 p-4 text-sm">
        {report ? (
          <>
            <p>
              <StatusBadge tone={report.passed ? 'accent' : 'danger'}>{report.passed ? 'Passed' : 'Blocked'}</StatusBadge>{' '}
              <span className="text-xs text-ink-soft">checked {formatDateTime(report.checkedAt)}</span>
            </p>
            <ul className="space-y-2">
              {report.checks.map((check) => (
                <li key={check.code}>
                  <p className="flex items-start gap-1.5">
                    {check.ok ? (
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    ) : (
                      <Circle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-evidence-limitation" />
                    )}
                    <span className={check.ok ? 'text-ink' : 'font-semibold text-evidence-limitation'}>
                      {check.label}
                      <span className="sr-only">{check.ok ? ': passed' : ': failed'}</span>
                    </span>
                  </p>
                  {!check.ok && check.details.length > 0 ? (
                    <ul className="ml-6 mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-ink-soft">
                      {check.details.slice(0, 20).map((line) => (
                        <li key={line} className="[overflow-wrap:anywhere]">
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-ink-soft">Not validated yet.</p>
        )}
        <p className="border-t border-line pt-3 text-xs text-ink-soft">
          Schema check in this browser:{' '}
          {schemaIssues.length === 0 ? (
            <span className="font-semibold text-accent">the snapshot conforms to the published schema</span>
          ) : (
            <span className="font-semibold text-evidence-limitation">{schemaIssues.length} problem(s): {schemaIssues.slice(0, 3).join('; ')}</span>
          )}
          . The release build runs the same check again before building.
        </p>
      </Surface>
    </Panel>
  );
}

function ReviewPanel({ detail }: { detail: ReleaseDetail }) {
  const { review, release } = detail;
  if (release.origin === 'baseline_import') {
    return (
      <Panel title="Changes">
        <Surface className="p-4 text-sm text-ink-soft">
          The imported baseline is the snapshot the live site was built from before releases existed. It has nothing to
          compare with.
        </Surface>
      </Panel>
    );
  }
  return (
    <Panel
      title="Review changes"
      description={`Published (${detail.base ? releaseName(detail.base) : 'base'}) on the left, this release on the right. Only these entities change.`}
    >
      <div className="space-y-5">
        {review.warnings.length > 0 ? (
          <Notice tone="warning" title="Check before approving">
            <ul className="list-disc space-y-0.5 pl-4">
              {review.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Notice>
        ) : null}

        <Surface>
          <h3 className="border-b border-line px-4 py-2 text-xs font-semibold text-ink-soft">Metrics ({review.metrics.length})</h3>
          {review.metrics.length === 0 ? <p className="px-4 py-3 text-sm text-ink-soft">No metric changes.</p> : null}
          {review.metrics.map((metric) => (
            <div key={metric.key} className="border-b border-line px-4 py-3 last:border-b-0">
              <p className="flex flex-wrap items-baseline gap-2 text-sm">
                <Link href={`/metrics/detail/?key=${encodeURIComponent(metric.key)}`} className="font-mono text-xs font-semibold text-accent hover:underline">
                  {metric.key}
                </Link>
                <span className="text-ink-soft">{metric.name}</span>
                <StatusBadge tone="info">{metric.change}</StatusBadge>
              </p>
              <ChangeTable fields={metric.fields} />
              {metric.dependents.length > 0 ? (
                <p className="mt-1 text-xs text-ink-soft">Calculated from this metric: {metric.dependents.join(', ')}</p>
              ) : null}
            </div>
          ))}
        </Surface>

        <Surface>
          <h3 className="border-b border-line px-4 py-2 text-xs font-semibold text-ink-soft">Documents ({review.documents.length})</h3>
          {review.documents.length === 0 ? <p className="px-4 py-3 text-sm text-ink-soft">No document changes.</p> : null}
          {review.documents.map((document) => (
            <div key={document.key} className="border-b border-line px-4 py-3 last:border-b-0">
              <p className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-mono text-xs font-semibold">{document.key}</span>
                <StatusBadge tone="info">{document.change}</StatusBadge>
                <span className={`text-xs ${document.tokens.before === document.tokens.after ? 'text-ink-soft' : 'font-semibold text-evidence-limitation'}`}>
                  Protected tokens: {document.tokens.before} published, {document.tokens.after} in this release
                </span>
              </p>
              <ChangeTable fields={document.fields} />
            </div>
          ))}
        </Surface>

        {review.linkedPhrases.length > 0 ? (
          <Surface>
            <h3 className="border-b border-line px-4 py-2 text-xs font-semibold text-ink-soft">Linked phrases</h3>
            <ul className="list-disc space-y-0.5 px-8 py-3 text-sm">
              {review.linkedPhrases.map((phrase) => (
                <li key={phrase}>{phrase}</li>
              ))}
            </ul>
          </Surface>
        ) : null}
      </div>
    </Panel>
  );
}

function ChangeTable({ fields }: { fields: readonly FieldChange[] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
        <thead>
          <tr className="text-ink-soft">
            <th scope="col" className="w-48 py-1 pr-2 font-semibold">Field</th>
            <th scope="col" className="py-1 pr-2 font-semibold">Published</th>
            <th scope="col" className="py-1 font-semibold">This release</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.path} className="border-t border-line align-top">
              <th scope="row" className="py-1 pr-2 text-left font-mono font-normal text-ink-soft [overflow-wrap:anywhere]">
                {field.path}
                {field.hasTokens ? <span className="ml-1 text-evidence-reported">(tokens)</span> : null}
              </th>
              <td className="py-1 pr-2 text-ink-faint [overflow-wrap:anywhere]">{displayValue(field.before)}</td>
              <td className="py-1 text-ink [overflow-wrap:anywhere]">{displayValue(field.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Act = (message: string, action: () => Promise<DataResult<unknown>>) => Promise<DataResult<unknown>>;

function Actions({ detail, repo, act }: { detail: ReleaseDetail; repo: ReleasesRepository; act: Act }) {
  const { release } = detail;
  const [error, setError] = useState<DataError | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (message: string, action: () => Promise<DataResult<unknown>>) => {
    setBusy(true);
    setError(null);
    const result = await act(message, action);
    setBusy(false);
    if (!result.ok) setError(result.error);
    return result.ok;
  };

  // Comparisons rather than a switch: see completedStep in lib/releases/model.ts.
  let body: ReactNode;
  const { status } = release;
  if (status === 'draft') {
    body = (
      <>
        <p className="text-sm text-ink-soft">
          Validation runs every database check and this browser&apos;s schema check on the frozen snapshot. A failed check
          keeps the release a draft, with the reason.
        </p>
        <button type="button" disabled={busy} onClick={() => run('Validation recorded.', () => repo.validateRelease(release))} className={buttonClass.primary}>
          {busy ? 'Validating…' : 'Validate release'}
        </button>
        <CancelForm release={release} busy={busy} onCancel={(reason) => run('Release cancelled.', () => repo.cancelRelease(release, reason))} />
      </>
    );
  } else if (status === 'review') {
    body = <ApproveForm detail={detail} busy={busy} onApprove={() => run('Release approved.', () => repo.approveRelease(detail))} onCancel={(reason) => run('Release cancelled.', () => repo.cancelRelease(release, reason))} />;
  } else if (status === 'approved') {
    body = (
      <>
        <p className="text-sm text-ink-soft">
          Confirm publish to start the build. This records the start; nothing is built or deployed from the admin.
        </p>
        <button type="button" disabled={busy} onClick={() => run('Publishing started. Build the release on your machine.', () => repo.startPublish(release))} className={buttonClass.primary}>
          Confirm publish
        </button>
        <CancelForm release={release} busy={busy} onCancel={(reason) => run('Release cancelled.', () => repo.cancelRelease(release, reason))} />
      </>
    );
  } else if (status === 'publishing') {
    body = <PublishingSteps release={release} repo={repo} busy={busy} run={run} />;
  } else if (status === 'published') {
    body = (
      <p className="text-sm text-ink-soft">
        This release is the published baseline. To undo it, create a rollback release on the{' '}
        <Link href="/releases/" className="text-accent hover:underline">Releases</Link> screen.
      </p>
    );
  } else if (status === 'failed') {
    body = (
      <p className="text-sm text-ink-soft">
        Publishing failed at <strong>{release.failure_stage}</strong>: {release.failure_message}. The published release and the
        live site were not changed. Fix the cause and create a new release.
      </p>
    );
  } else {
    body = <p className="text-sm text-ink-soft">{releaseStatusLabels[release.status].description}</p>;
  }

  return (
    <div className="space-y-3">
      {body}
      {error ? <ErrorMessage error={error} /> : null}
    </div>
  );
}

function ApproveForm({
  detail,
  busy,
  onApprove,
  onCancel,
}: {
  detail: ReleaseDetail;
  busy: boolean;
  onApprove: () => Promise<boolean>;
  onCancel: (reason: string) => Promise<boolean>;
}) {
  const [reviewed, setReviewed] = useState(false);
  const { release, schemaIssues } = detail;
  return (
    <>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
        <span>
          I reviewed every change listed for {releaseName(release)} (snapshot <code className="text-xs">{release.snapshot_sha256.slice(0, 12)}…</code>).
        </span>
      </label>
      <button type="button" disabled={busy || !reviewed || schemaIssues.length > 0} onClick={() => void onApprove()} className={buttonClass.primary}>
        Approve release
      </button>
      {schemaIssues.length > 0 ? <p className="text-xs text-evidence-limitation">The schema check in this browser failed; the release cannot be approved.</p> : null}
      <CancelForm release={release} busy={busy} onCancel={onCancel} />
    </>
  );
}

function CancelForm({ release, busy, onCancel }: { release: ReleaseRow; busy: boolean; onCancel: (reason: string) => Promise<boolean> }) {
  const [reason, setReason] = useState('');
  return (
    <details className="border-t border-line pt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-ink-soft">Cancel this release</summary>
      <div className="mt-2 space-y-2">
        <Field id={`cancel-${release.id}`} label="Reason" required>
          <input id={`cancel-${release.id}`} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
        </Field>
        <button type="button" disabled={busy || !reason.trim()} onClick={() => void onCancel(reason)} className={buttonClass.secondary}>
          Cancel release
        </button>
      </div>
    </details>
  );
}

function PublishingSteps({
  release,
  repo,
  busy,
  run,
}: {
  release: ReleaseRow;
  repo: ReleasesRepository;
  busy: boolean;
  run: (message: string, action: () => Promise<DataResult<unknown>>) => Promise<boolean>;
}) {
  const [buildSha, setBuildSha] = useState('');
  const [deployed, setDeployed] = useState(false);
  const [stage, setStage] = useState<FailureStage>('build');
  const [message, setMessage] = useState('');
  const [downloadError, setDownloadError] = useState<DataError | null>(null);
  const fileName = `release-${release.id}.snapshot.json`;

  async function download() {
    setDownloadError(null);
    const result = await repo.downloadSnapshot(release);
    if (!result.ok) {
      setDownloadError(result.error);
      return;
    }
    const url = URL.createObjectURL(new Blob([result.data.text], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.data.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 text-sm">
      <Notice tone="info" title="Deployment is manual">
        The admin cannot build or upload the site, and it cannot see the live site. It records the build you verified and
        your confirmation that you deployed it — nothing more.
      </Notice>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-ink-soft">1. Download the frozen snapshot</h3>
        <button type="button" onClick={() => void download()} className={buttonClass.secondary}>
          <Download aria-hidden="true" className="h-4 w-4" />
          {fileName}
        </button>
        {downloadError ? <ErrorMessage error={downloadError} /> : null}
      </section>

      <section className="space-y-1">
        <h3 className="text-xs font-semibold text-ink-soft">2. Build and verify it on your machine</h3>
        <pre className="overflow-x-auto rounded-md bg-paper-sunk p-2 text-[0.6875rem] leading-relaxed">
          {`npm run release:build -- --snapshot ${fileName} --sha256 ${release.snapshot_sha256} --release ${release.id}`}
        </pre>
        <p className="text-xs text-ink-soft">It checks the SHA-256 and the schema, builds the public site, verifies the output and prints the archive&apos;s SHA-256.</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-ink-soft">3. Record the verified build</h3>
        {release.build_sha256 ? (
          <p className="text-xs text-accent">Recorded: <code className="break-all">{release.build_sha256}</code></p>
        ) : (
          <>
            <Field id="build-sha" label="Build SHA-256 printed by release:build" required>
              <input id="build-sha" value={buildSha} onChange={(event) => setBuildSha(event.target.value)} className={`${inputClass} font-mono text-xs`} spellCheck={false} />
            </Field>
            <button type="button" disabled={busy || !buildSha.trim()} onClick={() => void run('Verified build recorded.', () => repo.recordBuild(release, buildSha))} className={buttonClass.primary}>
              Record verified build
            </button>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-ink-soft">4. Deploy, then mark published</h3>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={deployed} disabled={!release.build_sha256} onChange={(event) => setDeployed(event.target.checked)} className="mt-1" />
          <span>
            I uploaded the verified build of {releaseName(release)} to the host myself, and the live site shows it
            (release:verify-live passed).
          </span>
        </label>
        <button type="button" disabled={busy || !release.build_sha256 || !deployed} onClick={() => void run('Release marked published.', () => repo.markPublished(release, deployed))} className={buttonClass.primary}>
          Mark published
        </button>
      </section>

      <details className="border-t border-line pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-evidence-limitation">Record a failure</summary>
        <div className="mt-2 space-y-2">
          <Field id="failure-stage" label="Stage">
            <select id="failure-stage" value={stage} onChange={(event) => setStage(event.target.value as FailureStage)} className={inputClass}>
              {FAILURE_STAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="failure-message" label="What failed" required>
            <textarea id="failure-message" rows={2} value={message} onChange={(event) => setMessage(event.target.value)} className={inputClass} />
          </Field>
          <p className="text-xs text-ink-soft">The published release stays as it is. If you already uploaded part of this build, redeploy the published release&apos;s build.</p>
          <button type="button" disabled={busy || !message.trim()} onClick={() => void run('Failure recorded. The published release was not changed.', () => repo.recordFailure(release, stage, message))} className={buttonClass.danger}>
            Record failure
          </button>
        </div>
      </details>
    </div>
  );
}
