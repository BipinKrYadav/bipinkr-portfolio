import type { ReactNode } from 'react';

import { MetricsRepositoryProvider } from '@admin/components/metrics/MetricsRepositoryProvider';
import { publishedMetricReferences } from '@admin/lib/snapshot-catalog';

// Server component: the snapshot is read here at build time; the browser gets only the index.
export default function MetricsLayout({ children }: { children: ReactNode }) {
  return <MetricsRepositoryProvider snapshotReferences={publishedMetricReferences}>{children}</MetricsRepositoryProvider>;
}
