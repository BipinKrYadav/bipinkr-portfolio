'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { buttonClass, inputClass } from '@admin/components/ui/Field';
import { ErrorMessage } from '@admin/components/metrics/StateMessage';
import type { DataResult } from '@admin/lib/metrics/errors';
import type { DocumentDetail } from '@admin/lib/content/repository';
import { hasProtectedToken } from '@admin/lib/content/draft';

interface EditableField {
  path: (string | number)[];
  label: string;
  value: string;
  multiline: boolean;
}

const LOCKED_KEYS = new Set(['$icon', '$metricValue', '$pair', 'slug', 'id', 'href', 'number', 'key', 'width', 'tone', 'state', 'numeric']);

function pathLabel(path: readonly (string | number)[]): string {
  return path
    .map((part) => (typeof part === 'number' ? '[' + part + ']' : part.replace(/([a-z])([A-Z])/g, '$1 $2')))
    .join(' › ');
}

function collectEditable(value: unknown, path: (string | number)[] = [], fields: EditableField[] = []): EditableField[] {
  if (typeof value === 'string') {
    const last = path[path.length - 1];
    if (typeof last === 'string' && !LOCKED_KEYS.has(last) && !hasProtectedToken(value)) {
      fields.push({
        path,
        label: pathLabel(path),
        value,
        multiline: value.length > 100 || value.includes('\n'),
      });
    }
    return fields;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectEditable(item, [...path, index], fields));
    return fields;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => key.startsWith('$'))) return fields;
    for (const [key, item] of Object.entries(record)) collectEditable(item, [...path, key], fields);
  }

  return fields;
}

function setAtPath(root: unknown, path: readonly (string | number)[], nextValue: string): unknown {
  if (!path.length) return nextValue;
  const [head, ...tail] = path;

  if (Array.isArray(root)) {
    const copy = [...root];
    copy[Number(head)] = setAtPath(copy[Number(head)], tail, nextValue);
    return copy;
  }

  if (root && typeof root === 'object') {
    const copy = { ...(root as Record<string, unknown>) };
    copy[String(head)] = setAtPath(copy[String(head)], tail, nextValue);
    return copy;
  }

  throw new Error('Cannot update an invalid draft path.');
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function DocumentDraftEditor({
  detail,
  onSave,
  onDirtyChange,
}: {
  detail: DocumentDetail;
  onSave: (draft: unknown, changeSummary: string) => Promise<DataResult<unknown>>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<unknown>(() => detail.draft);
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<DataResult<unknown> | null>(null);

  useEffect(() => {
    setDraft(detail.draft);
    setSummary('');
    setResult(null);
  }, [detail]);

  const fields = useMemo(() => collectEditable(draft), [draft]);
  const dirty = useMemo(() => !same(draft, detail.draft), [draft, detail.draft]);
  const protectedCount = useMemo(() => {
    let count = 0;
    const walk = (value: unknown) => {
      if (typeof value === 'string') {
        if (hasProtectedToken(value)) count += 1;
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
          if (key.startsWith('$')) count += 1;
          else walk(item);
        });
      }
    };
    walk(draft);
    return count;
  }, [draft]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function update(path: readonly (string | number)[], event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setResult(null);
    // Typed explicitly: with useState<unknown>, SetStateAction<unknown> collapses to `unknown`,
    // which gives the updater no contextual parameter type.
    setDraft((current: unknown) => setAtPath(current, path, event.target.value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || !summary.trim()) return;
    setSaving(true);
    const saved = await onSave(draft, summary);
    setSaving(false);
    setResult(saved);
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Edit document draft" className="space-y-5">
      <div className="rounded-card border border-line bg-paper-sunk p-3 text-sm">
        <p className="font-medium text-ink">Phase 5A: editorial copy only</p>
        <p className="mt-1 text-xs text-ink-soft">
          Metric, evidence and client-label tokens are locked. Structural fields, links, icons and ordering are locked.
          Saving creates a new immutable revision; it does not publish the page.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <label key={field.path.join('.')} className="block">
            <span className="mb-1 block text-xs font-medium text-ink-soft">{field.label}</span>
            {field.multiline ? (
              <textarea
                rows={4}
                value={field.value}
                onChange={(event) => update(field.path, event)}
                className={inputClass}
                disabled={saving}
              />
            ) : (
              <input value={field.value} onChange={(event) => update(field.path, event)} className={inputClass} disabled={saving} />
            )}
          </label>
        ))}
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-ink-soft">No editable editorial text fields are available for this document.</p>
      ) : null}

      <p className="text-xs text-ink-faint">
        {fields.length} editable text field{fields.length === 1 ? '' : 's'} · {protectedCount} protected token/structural group
        {protectedCount === 1 ? '' : 's'}
      </p>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-soft">Change summary <span aria-hidden="true">*</span></span>
        <textarea
          rows={2}
          value={summary}
          onChange={(event) => {
            setSummary(event.target.value);
            setResult(null);
          }}
          className={inputClass}
          disabled={saving}
          placeholder="Example: Updated the homepage introduction copy."
        />
      </label>

      {result && !result.ok ? <ErrorMessage error={result.error} /> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonClass.primary} disabled={saving || !dirty || !summary.trim()}>
          {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          disabled={saving || !dirty}
          onClick={() => {
            setDraft(detail.draft);
            setSummary('');
            setResult(null);
          }}
        >
          Discard changes
        </button>
      </div>
    </form>
  );
}
