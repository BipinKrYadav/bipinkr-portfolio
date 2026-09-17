import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MetricDetailView } from '@admin/components/metrics/MetricDetailView';
import { LoadingMessage } from '@admin/components/metrics/StateMessage';

export const metadata: Metadata = { title: 'Metric' };

/** Static route; the metric key comes from ?key= and is resolved in the browser after sign-in. */
export default function MetricDetailPage() {
  return (
    <Suspense fallback={<LoadingMessage label="Loading metric…" />}>
      <MetricDetailView />
    </Suspense>
  );
}
