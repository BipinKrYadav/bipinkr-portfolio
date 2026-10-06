import type { ReactNode } from 'react';

import { ReleasesRepositoryProvider } from '@admin/components/releases/ReleasesRepositoryProvider';

// Nothing is read here at build time: release data is requested in the
// browser, after sign-in, with the admin's own session.
export default function ReleasesLayout({ children }: { children: ReactNode }) {
  return <ReleasesRepositoryProvider>{children}</ReleasesRepositoryProvider>;
}
