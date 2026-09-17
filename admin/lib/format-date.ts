const dateTime = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' });

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : dateTime.format(time);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : dateOnly.format(time);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
