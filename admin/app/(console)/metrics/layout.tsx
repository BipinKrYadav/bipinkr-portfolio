import type { ReactNode } from 'react';

import { MetricsRepositoryProvider } from '@admin/components/metrics/MetricsRepositoryProvider';

export default function MetricsLayout({ children }: { children: ReactNode }) {
  return <MetricsRepositoryProvider>{children}</MetricsRepositoryProvider>;
}
