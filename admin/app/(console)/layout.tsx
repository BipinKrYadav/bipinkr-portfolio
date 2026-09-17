import type { ReactNode } from 'react';

import { AuthGate } from '@admin/components/auth/AuthGate';
import { AdminShell } from '@admin/components/shell/AdminShell';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      <AuthGate>{children}</AuthGate>
    </AdminShell>
  );
}
