import type { ReactNode } from 'react';

import { ContentRepositoryProvider } from '@admin/components/content/ContentRepositoryProvider';

// Nothing is read here at build time: document data is requested in the
// browser, after sign-in, with the admin's own session.
export default function ContentLayout({ children }: { children: ReactNode }) {
  return <ContentRepositoryProvider>{children}</ContentRepositoryProvider>;
}
