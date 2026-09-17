# Admin panel

Phase 3D built the shell. Phase 3E adds the first working feature: **metric editing**. Content, case studies, media, releases and the audit log screens are still placeholders.

The admin will connect to the Supabase backend described in [admin-backend.md](admin-backend.md). There is still no Supabase project and no working sign-in, so in any real build the metrics screens show "Authentication not configured" and load nothing.

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
- The admin compiles two pure public-site modules instead of copying them (`experimental.externalDir`):
  - `lib/metrics/formulas.ts`: the fixed formula engine.
  - `lib/metrics/format.ts`: value formatting.

## Routes

| Route | Screen |
|---|---|
| `/login/` | Sign-in (email and password, then authenticator code) |
| `/` | Dashboard |
| `/metrics/` | Metrics list |
| `/metrics/detail/?key=<metric_key>` | Metric detail and editing |
| `/content/` | Documents / Content |
| `/case-studies/` | Case Studies |
| `/media-evidence/` | Media & Evidence |
| `/releases/` | Releases |
| `/audit-log/` | Audit Log |
| `/settings/` | Settings |

All routes except `/login/` live in the `app/(console)` route group, which wraps them in `AdminShell` (sidebar, top bar, main area) and `AuthGate`. The metric key is a query parameter because a static export cannot pre-render one page per database row.

## Metric editing (Phase 3E)

### Data access

```
UI components ──► MetricsRepository ──► MetricsGateway ──► Supabase Data API (PostgREST)
 (admin/components/metrics)  (lib/metrics/repository.ts)  (lib/metrics/gateway.ts)
```

- **`MetricsGateway`** holds the only backend operations the screens use: list, get by key, verification state, versions, evidence links, document references, linked phrases, update, the two review functions, and archive. Implementations apply no business rules.
- **`createPostgrestGateway`** is the real adapter (`lib/metrics/postgrest-gateway.ts`).
  - It sends the publishable key as `apikey` and the signed-in admin's own access token as the bearer token, so RLS, grants, triggers and functions apply as that user.
  - It never sends a request without a token.
  - Updates use `updated_at` for optimistic concurrency, so an edit based on a stale copy is rejected instead of overwriting someone else's change.
- **`MetricsRepository`** turns results into `DataResult` values with one of these kinds: `unavailable`, `unauthenticated`, `permission_denied`, `validation`, `not_found`, `conflict` or `unknown`.
  - Database errors are classified by SQLSTATE, and constraint names are translated into readable messages.
  - Its checks only give earlier feedback; the database repeats every rule and decides.
- **`MetricsRepositoryProvider`** creates a repository only when both are true:
  - the session is `authenticated`;
  - the Supabase settings are valid.

  Otherwise every screen shows the specific reason, with no request and no data.

### Rules the UI applies (and the database enforces)

| Rule | UI | Database |
|---|---|---|
| Editable fields | Exactly `EDITABLE_METRIC_FIELDS` (the backend's update grant) | Column grants |
| Metric key immutable | Shown locked, never in a patch | No update grant, plus a trigger |
| Change reason for value, kind, formula or precision | Required field; Save disabled without it | `guard_metric_change` raises |
| Formula: supported function, all inputs, inputs exist and are active, no self-reference, no cycle | `validateFormula`, shown inline | `is_valid_formula` check plus `guard_metric_change` |
| Evidence status and verification | Separate review actions only | No grants; only `set_metric_evidence_status` (reason) and `confirm_metric_verification` (note) |
| Archiving | Lists each blocker (formulas, page content, linked phrases); no delete; sends no timestamp | `archive_metric()` only; database time forced by trigger; no unarchive; archive triggers (migrations 3–4); new references to archived metrics refused (migration 8) |

### Verification

- **Computed by the database:** the verification state comes from the `metric_verification` view (migration 9). The admin never computes it.
  - "Verified at current value": a source check is recorded, and nothing it covers has changed.
  - "Changed since verification": after the check, one of these changed:
    - the metric's own value, kind, formula or precision;
    - its evidence status;
    - the figure of any metric its formula reads, at any depth.
  - "Not verified": no source check is recorded.
- **Dependencies:** if Spend changes after CPL was verified, CPL becomes stale, and so does anything calculated from CPL. The detail page names the inputs that changed. Re-confirming after checking the source restores the verified state.
- **Editing a verified metric:** the edit form warns before saving. The detail page then says the previous verification may no longer represent the current value.
- **No automatic verification:** nothing is ever re-verified automatically, and review actions are locked while the edit form has unsaved changes.

### Version history and audit

- Every insert, edit, evidence status change, confirmation and archive creates a `metric_versions` row, written by the database.
- The detail page shows each version (numbered, newest first) with:
  - previous and current value, formula, kind, precision, evidence status and archive state;
  - other changed fields;
  - reason;
  - who and when.
- The UI has no way to edit or delete history.
- Audit entries are written by the database for every mutation. The UI never creates them.

### Evidence

- Shows only metadata already in the database: file name, description, type, size, SHA-256, personal-data flag, retention review date, private locator, when linked and by whom.
- Shows whether the link was made before or after the last source check.
- No URLs, no uploads.

## Authentication boundary

- `lib/auth/types.ts` defines the `AuthState` states: `loading`, `unconfigured`, `misconfigured`, `signed_out`, `mfa_required`, `not_authorised` and `authenticated`. It also defines the `AdminAuthClient` contract, including `getAccessToken()`, which a Supabase Auth adapter will implement.
- `lib/auth/config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It rejects secret or service-role keys and non-HTTPS URLs.
- `lib/auth/client.ts` has no Supabase adapter yet.
  - The client it returns reports `unconfigured`, and every sign-in attempt fails with an explicit error.
  - Its access token is always null.
  - Even when both settings are present, it reports that the adapter has not been built. It never reports a session.
- `components/auth/AuthGate.tsx` decides what the console renders:
  - `authenticated`: the page.
  - `unconfigured`: the page structure under a permanent "Authentication not configured" notice. This is an interface preview; nobody is signed in and there is no data to show.
  - every other state: the page is withheld.

**Rules for the adapter phase:**
- Report `authenticated` only for an `aal2` session whose `admin_users` row is readable, which is the same test RLS applies.
- Load backend data only in client components, after the gate. A static export bakes server-component output into public files, so server components may use public snapshot identifiers only.
- Add the Supabase origin to the CSP `connect-src` in `app/layout.tsx`. Until then the browser would block Data API requests.

## Security controls

- **Search engines:** every page is `noindex, nofollow, nocache`, and `robots.txt` disallows all crawling.
- **Browser policy:** every page sets `referrer: no-referrer`.
- **Content Security Policy** (meta tag):
  - self-only scripts, styles, fonts, images and connections;
  - no frames, objects or external form targets;
  - `'unsafe-inline'` scripts are required by the Next.js export bootstrap.
- **No tracking:** no GTM, GA4, Meta Pixel or `dataLayer`.
- **Secret keys:**
  - `admin/config/public-env-guard.mjs` (run by `next.config.mjs`) fails the build if any `NEXT_PUBLIC_*` variable has a secret-looking name, holds an `sb_secret_` key, or holds a JWT whose role is not `anon`.
  - The runtime config check refuses these keys again.
  - Settings only shows whether each value is set, never the value.
- **Private files:** no file URLs are rendered or built. Evidence and media originals will open only through short-lived signed links requested after sign-in.
- **No invented figures:** every backend-sourced card and table shows an explicit loading, unavailable or error state. No values, records or activity are invented.

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

```bash
npm run admin:test
```

- `admin:dev` starts a dev server on http://localhost:3100.
- `admin:build` produces the static export in `admin/out/`.
- `admin:check` verifies isolation and security. Pass `--public <dir>` to check a public build that isn't in `out/`.
- `admin:test` runs the metric editing tests (`admin/tests`, Node's test runner). There are three kinds:
  - Pure rule tests.
  - Repository and gateway tests against every migration in an in-memory PGlite database, run as admin, non-admin, admin without MFA and anonymous. These include loading all 134 snapshot metrics and checking the admin shows the same values as the site.
  - PostgREST request tests with a stubbed `fetch`, plus the secret-key guard.
- `npm run typecheck` and `npm run lint` cover both apps. `npm run build` still builds only the public site.

## Not in this phase

- **Auth:** the Supabase Auth adapter, MFA enrolment and challenge, and session handling.
- **Other editing:** content, case study, media, blog and release screens.
- **Evidence files:** uploads, linking evidence, and signed URLs.
- **Publishing:** release creation, publishing, deployment and rollback, and importing the snapshot metrics into a real database.
- **Hosting:** hosting the admin, and security headers served by the host (CSP header, `X-Frame-Options`, HSTS).
- **Document types:** Free Ad Audit (none exists in the backend yet), and blog posts in the snapshot.
