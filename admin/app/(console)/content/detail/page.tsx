import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DocumentDetailView } from '@admin/components/content/DocumentDetailView';
import { LoadingMessage } from '@admin/components/metrics/StateMessage';

export const metadata: Metadata = { title: 'Document' };

/**
 * Static route; the document comes from ?type=&slug= and is read in the
 * browser after sign-in. Nothing about any document is built into this page.
 */
export default function DocumentDetailPage() {
  return (
    <Suspense fallback={<LoadingMessage label="Loading document…" />}>
      <DocumentDetailView />
    </Suspense>
  );
}
