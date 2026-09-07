import type { DataTableContent } from '@/content/types';
import { cn } from '@/lib/utils';

interface DataTableProps extends DataTableContent {
  className?: string;
  /** Hide the caption visually while keeping it for screen readers. */
  hideCaption?: boolean;
}

/**
 * Campaign data table.
 *
 * Wrapped in a horizontally scrollable region on narrow screens rather
 * than being squashed — a data table that has been shrunk until it is
 * unreadable is worse than one you have to scroll.
 */
export function DataTable({
  caption,
  columns,
  rows,
  footRow,
  note,
  className,
  hideCaption = false,
}: DataTableProps) {
  return (
    <figure className={cn('not-prose', className)}>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={caption ?? 'Data table'}>
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          {caption ? (
            <caption
              className={cn(
                'mb-3 text-left text-xs uppercase tracking-[0.09em] text-ink-faint',
                hideCaption && 'sr-only',
              )}
            >
              {caption}
            </caption>
          ) : null}

          <thead>
            <tr className="border-b border-line-strong">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'py-2.5 pr-4 text-micro font-semibold uppercase tracking-[0.09em] text-ink-faint',
                    column.numeric && 'pr-0 text-right',
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row[columns[0].key]}-${index}`}
                className="border-b border-line last:border-b-0"
              >
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      'py-3 pr-4 align-top',
                      column.numeric && 'pr-0 text-right tabular-nums',
                      columnIndex === 0 ? 'font-medium text-ink' : 'text-ink-soft',
                    )}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {footRow ? (
            <tfoot>
              <tr className="border-t-2 border-line-strong">
                {columns.map((column, columnIndex) => (
                  <td
                    key={column.key}
                    className={cn(
                      'py-3 pr-4 font-semibold text-ink',
                      column.numeric && 'pr-0 text-right tabular-nums',
                      columnIndex === 0 && 'whitespace-nowrap',
                    )}
                  >
                    {footRow[column.key]}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {note ? (
        <figcaption className="mt-3 border-l-2 border-line-strong pl-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          {note}
        </figcaption>
      ) : null}
    </figure>
  );
}
