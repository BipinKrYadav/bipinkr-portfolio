import type { Metadata } from 'next';

import { LoginPanel } from '@admin/components/auth/LoginPanel';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-semibold tracking-tight">bipinkr.in</span>
          <span className="rounded-md border border-line-strong px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink-soft">
            Admin
          </span>
        </div>
        <div className="rounded-card border border-line bg-paper-raised p-6 shadow-card">
          <h1 className="mb-5 text-lg font-semibold">Admin sign-in</h1>
          <LoginPanel />
        </div>
      </div>
    </main>
  );
}
