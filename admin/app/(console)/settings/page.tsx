import type { Metadata } from 'next';

import { AuthAdapterStatus, SignedInAccount } from '@admin/components/auth/AccountSummary';
import { AuthenticatorFactors } from '@admin/components/auth/AuthenticatorFactors';
import { AuthStatusBadge } from '@admin/components/auth/AuthStatusBadge';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { DefinitionList, Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { readAuthConfig } from '@admin/lib/auth/config';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  // Evaluated at build time. Only whether each value is set is rendered — never the value.
  const config = readAuthConfig();
  const urlSet = config.status === 'configured' || (config.status === 'unconfigured' && !config.missing.includes('NEXT_PUBLIC_SUPABASE_URL'));
  const keySet =
    config.status === 'configured' ||
    (config.status === 'unconfigured' && !config.missing.includes('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'));

  const isSet = (set: boolean) => (set ? <StatusBadge tone="accent">Set</StatusBadge> : <StatusBadge>Not set</StatusBadge>);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Account, authentication and security configuration. Read-only; secret values are never shown."
        meta={<StatusBadge>Read-only</StatusBadge>}
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <Panel title="Admin account">
          <Surface>
            <DefinitionList
              items={[
                { term: 'Session', detail: <AuthStatusBadge /> },
                { term: 'Signed-in account', detail: <SignedInAccount /> },
                { term: 'Role', detail: 'Owner (a single admin account)' },
                { term: 'Authenticator apps', detail: <AuthenticatorFactors /> },
              ]}
            />
          </Surface>
        </Panel>

        <Panel title="Authentication">
          <Surface>
            <DefinitionList
              items={[
                { term: 'Provider', detail: 'Supabase Auth: email and password' },
                { term: 'Second factor', detail: 'Authenticator app (TOTP), required. The database refuses sessions without it.' },
                { term: 'Supabase URL', detail: isSet(urlSet) },
                { term: 'Publishable key', detail: <>{isSet(keySet)} <span className="ml-1 text-xs text-ink-faint">Value never displayed</span></> },
                {
                  term: 'Configuration check',
                  detail:
                    config.status === 'misconfigured' ? (
                      <StatusBadge tone="danger">{config.problem}</StatusBadge>
                    ) : (
                      <StatusBadge tone={config.status === 'configured' ? 'accent' : 'warning'}>
                        {config.status === 'configured' ? 'Settings valid' : 'Not configured'}
                      </StatusBadge>
                    ),
                },
                { term: 'Auth adapter', detail: <AuthAdapterStatus /> },
              ]}
            />
          </Surface>
        </Panel>

        <Panel title="Security">
          <Surface>
            <DefinitionList
              items={[
                { term: 'Search engines', detail: 'noindex, nofollow on every page; robots.txt disallows all' },
                { term: 'Analytics and tracking', detail: 'None. No tag manager, analytics or advertising pixels are loaded.' },
                { term: 'Content Security Policy', detail: 'Scripts, styles, fonts and connections restricted to this origin' },
                { term: 'Secret keys', detail: 'The build fails if a secret or service-role key would reach the browser' },
                { term: 'Private files', detail: 'Short-lived signed links only; no file URLs are shown or stored' },
              ]}
            />
          </Surface>
        </Panel>

        <Panel title="Site settings">
          <Surface>
            <DefinitionList
              items={[
                { term: 'Public site', detail: 'bipinkr.in' },
                { term: 'Content source', detail: <code className="text-xs">snapshot/baseline.json</code> },
                { term: 'Tracking configuration', detail: 'Managed in the public site code; not editable here' },
                { term: 'Editing', detail: <StatusBadge>Not available</StatusBadge> },
              ]}
            />
          </Surface>
        </Panel>
      </div>
    </>
  );
}
