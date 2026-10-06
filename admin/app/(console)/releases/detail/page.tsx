import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingMessage } from '@admin/components/metrics/StateMessage';
import { ReleaseDetailView } from '@admin/components/releases/ReleaseDetailView';

export const metadata: Metadata = { title: 'Release' };

/** Static route; the release id comes from ?id= and is resolved in the browser after sign-in. */
export default function ReleaseDetailPage() {
  return (
    <Suspense fallback={<LoadingMessage label="Loading release…" />}>
      <ReleaseDetailView />
    </Suspense>
  );
}
