# Admin panel — shell

Phase 3D. This is the frontend structure of the admin panel, with no data and no working sign-in yet. It will later connect to the Supabase backend described in [admin-backend.md](admin-backend.md).

## Isolation from the public site

The admin is a **separate static Next.js app** in `admin/`:

| | Public site | Admin |
|---|---|---|
| Source | `app/`, `components/`, `content/`, `lib/` | `admin/` only |
| Build | `npm run build` → `out/` | `npm run admin:build` → `admin/out/` |
| Tailwind | Scans public folders only | Scans `admin/` only; reuses the design tokens as a preset |
| Env files | Repo root | `admin/.env*` only (root values such as the GTM ID are not loaded) |
| Tracking | GTM/GA4 | None |
| Deployment | Hostinger (unchanged) | Not deployed. Intended for a separate origin such as admin.bipinkr.in |

**How the separation is kept:**
- The admin reuses the repo's installed packages.
- The root `tsconfig.json` excludes `admin/`. The admin has its own `tsconfig.json`, `.eslintrc.json`, `next.config.mjs`, PostCSS and Tailwind config.
- Nothing in the public site imports from `admin/`.
- The admin reads `snapshot/baseline.json` read-only, and only for document names, slugs and status.

## Routes

| Route | Screen |
|---|---|
| `/login/` | Sign-in (email and password, then authenticator code) |
| `/` | Dashboard |
| `/metrics/` | Metrics |
| `/content/` | Documents / Content |
| `/case-studies/` | Case Studies |
| `/media-evidence/` | Media & Evidence |
| `/releases/` | Releases |
| `/audit-log/` | Audit Log |
| `/settings/` | Settings |

All routes except `/login/` live in the `app/(console)` route group, which wraps them in `AdminShell` (sidebar, top bar, main area) and `AuthGate`.

## Authentication boundary

- `lib/auth/types.ts` defines the `AuthState` states: `loading`, `unconfigured`, `misconfigured`, `signed_out`, `mfa_required`, `not_authorised` and `authenticated`. It also defines the `AdminAuthClient` contract that a Supabase Auth adapter will implement.
- `lib/auth/config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It rejects secret or service-role keys and non-HTTPS URLs.
- `lib/auth/client.ts` has no Supabase adapter yet. The client it returns reports `unconfigured`, and every sign-in attempt fails with an explicit error. Even when both settings are present, it reports that the adapter has not been built. It never reports a session.
- `components/auth/AuthGate.tsx` decides what the console renders:
  - `authenticated`: the page.
  - `unconfigured`: the page structure under a permanent "Authentication not configured" notice. This is an interface preview; nobody is signed in and there is no data to show.
  - every other state: the page is withheld.

**Rules for the adapter phase:**
- Report `authenticated` only for an `aal2` session whose `admin_users` row is readable, which is the same test RLS applies.
- Load backend data only in client components, after the gate. A static export bakes server-component output into public files, so server components may use public snapshot identifiers only.
- Add the Supabase origin to the CSP `connect-src` in `app/layout.tsx`.

## Security controls

- **Search engines:** every page is `noindex, nofollow, nocache`, and `robots.txt` disallows all crawling.
- **Browser policy:** every page sets `referrer: no-referrer`.
- **Content Security Policy** (meta tag):
  - self-only scripts, styles, fonts, images and connections;
  - no frames, objects or external form targets;
  - `'unsafe-inline'` scripts are required by the Next.js export bootstrap.
- **No tracking:** no GTM, GA4, Meta Pixel or `dataLayer`.
- **Secret keys:**
  - `admin/next.config.mjs` fails the build if any `NEXT_PUBLIC_*` variable has a secret-looking name, holds an `sb_secret_` key, or holds a JWT whose role is not `anon`.
  - The runtime config check refuses these keys again.
  - Settings only shows whether each value is set, never the value.
- **Private files:** no file URLs are rendered or built. Evidence and media originals will open only through short-lived signed links requested after sign-in.
- **No invented figures:** every backend-sourced card and table shows an explicit loading or "not connected" state. No values, records or activity are invented.

## Commands

```bash
npm run admin:dev
```

```bash
npm run admin:build
```

```bash
npm run admin:check
```

- `admin:dev` starts a dev server on http://localhost:3100.
- `admin:build` produces the static export in `admin/out/`.
- `admin:check` verifies isolation and security. Pass `--public <dir>` to check a public build that isn't in `out/`.
- `npm run typecheck` and `npm run lint` cover both apps. `npm run build` still builds only the public site.

## Not in this phase

- The Supabase Auth adapter, MFA enrolment and challenge, and session handling.
- Loading data, and any editing: metrics, evidence status, verification, documents or media.
- Uploads and signed URLs.
- Release creation, publishing, deployment and rollback.
- Hosting the admin, and security headers served by the host (CSP header, `X-Frame-Options`, HSTS).
- Document types for Free Ad Audit (none exists in the backend yet) and for blog posts in the snapshot.
