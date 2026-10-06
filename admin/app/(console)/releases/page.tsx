import type { Metadata } from 'next';

import { ReleasesOverview } from '@admin/components/releases/ReleasesOverview';
import { PageHeader } from '@admin/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Releases' };

export default function ReleasesPage() {
  return (
    <>
      <PageHeader
        title="Releases"
        description="The publishing area: what the live site shows, what is waiting, and every release. Drafts reach the public site only through a validated, reviewed, approved and confirmed release."
      />
      <ReleasesOverview />
    </>
  );
}
