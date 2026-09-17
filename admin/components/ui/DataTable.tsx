import type { ReactNode } from 'react';

import { cn } from '@admin/lib/cn';

import { ConnectionStateRow } from './ConnectionState';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface Row {
  key: string;
  cells: readonly ReactNode[];
}

/**
 * Operational table. With `rows` it renders them; without, it renders the
 * backend connection state (loading, or why there is no data) — never
 * placeholder records.
 */
export function DataTable({
  caption,
  columns,
  rows,
  emptyMessage,
}: {
  caption: string;
  columns: readonly Column[];
  rows?: readonly Row[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-paper-raised">
      <table className="w-full min-w-[44rem] border-collapse text-left text-[0.8125rem]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-paper-sunk">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'whitespace-nowrap px-3 py-2 text-xs font-semibold text-ink-soft',
                  column.align === 'right' && 'text-right',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows ? (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-line last:border-b-0">
                {row.cells.map((cell, index) => (
                  <td
                    key={columns[index]?.key ?? index}
                    className={cn('px-3 py-2 align-top', columns[index]?.align === 'right' && 'text-right')}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <ConnectionStateRow colSpan={columns.length} emptyMessage={emptyMessage} />
          )}
        </tbody>
      </table>
    </div>
  );
}
