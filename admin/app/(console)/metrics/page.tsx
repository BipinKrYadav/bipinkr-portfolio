import type { Metadata } from 'next';

import { MetricsList } from '@admin/components/metrics/MetricsList';
import { PageHeader } from '@admin/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Metrics' };

export default function MetricsPage() {
  return (
    <>
      <PageHeader
        title="Metrics"
        description="Canonical figures the public site renders, read from the database. Open a metric to edit it, review its evidence status and verification, or archive it. Publishing is a separate, later step."
      />
      <MetricsList />
    </>
  );
}
