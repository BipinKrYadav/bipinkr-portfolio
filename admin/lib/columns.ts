import type { Column } from '@admin/components/ui/DataTable';

/** Shared by the dashboard and the audit log. */
export const auditColumns: readonly Column[] = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'admin', label: 'Admin' },
  { key: 'action', label: 'Action' },
  { key: 'resource', label: 'Resource' },
  { key: 'result', label: 'Result' },
];
