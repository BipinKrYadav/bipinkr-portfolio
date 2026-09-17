# Admin backend (Supabase) — foundation

Phase 3C. This is the database, access-control and storage base for the future
admin panel. **Nothing here is used by the public website.** bipinkr.in is
still a static export built from `snapshot/baseline.json` (see
[content-snapshot.md](content-snapshot.md)). It has no Supabase client, key or
runtime request, and it keeps working if Supabase is down or deleted.

No Supabase project has been created yet. The migrations are written and
tested offline, and they have not been applied anywhere.

```
supabase/
  migrations/
    20260917000100_admin_access_and_audit.sql   enums, admin allow-list, is_admin(), audit log, stamping
    20260917000200_releases_and_service_tokens.sql
    20260917000300_metrics.sql                  metrics, versions, verification functions, blocked phrases
    20260917000400_content.sql                  documents, revisions, metric refs, redirects, linked phrases, release items
    20260917000500_media_and_evidence.sql       media assets/usages, evidence files, metric↔evidence links
    20260917000600_rls_and_grants.sql           RLS, column grants, policies
    20260917000700_storage.sql                  private buckets and storage policies
  tests/
    admin_foundation.test.sql                   one transaction, rolled back
```

---

## 1. Schema

| Table | Purpose | Key relationships and rules |
|---|---|---|
| `admin_users` | Allow-list of who may use the admin | PK → `auth.users`. Exactly one `owner` (partial unique index). Rows are created only by `private.grant_admin_owner()`. |
| `audit_log` | Append-only record of every change | Written by triggers and functions. Update, delete and truncate are blocked for every role. `token_hash` is stripped. |
| `metrics` | Canonical figures (mirrors `lib/metrics/types.ts`) | `metric_key` is unique and immutable. Shape checks apply per kind (raw, calculated, legacy_fixed). A formula must use the fixed function list, and its inputs must exist, be active and form no cycle. Currency matches value type. |
| `metric_versions` | Full before/after history of each metric | FK → metrics, releases. Append-only, except the pipeline may link it to a release once. |
| `metric_evidence` | Links a metric to a private evidence file | PK (metric, file). `locator` is private. |
| `evidence_files` | Metadata for files in the private `evidence` bucket | MIME allow-list, 20 MB limit, sha256. The file identity cannot change after upload. |
| `media_assets` | Metadata for originals in the private `media-originals` bucket | MIME allow-list, 10 MB limit (5 MB for PDF), sha256, alt text and redaction flag. An asset in use cannot be archived. |
| `media_usages` | Where each asset is used | PK (asset, document, field_path). |
| `documents` | Editable page drafts, in token form | Unique (doc_type, slug). Type and slug are immutable. Status and published revision are set only by the pipeline, and a published document must have a revision. |
| `document_revisions` | Frozen published content | Auto-numbered per document and append-only. Linked to a release. |
| `document_metric_refs` | Which metrics a document uses, and where | Drives the impact preview. Blocks archiving any metric that is referenced. |
| `linked_phrases` | Wording that restates a metric in words, so it cannot update itself (see below) | Unique (location, phrase). `metric_keys` must name existing metrics, and a referenced metric cannot be archived. `reviewed_by` comes from the session. |
| `blocked_phrases` | Claims-ledger blocklist | Unique on lower(phrase). |
| `redirects` | Reserved for later (slugs are locked in v1) | Paths start with `/`, may not redirect to themselves, and use 301 or 308. |
| `releases` | Publish and rollback runs | Allowed status transitions only. At most one in progress and one live. The snapshot and its sha256 are frozen once queued. |
| `release_items` | What each release changed | FK → release, metric version, document revision. Rows cannot be updated. |
| `service_tokens` | Machine tokens for build, deploy-report and backup | Only a SHA-256 hash is stored, with scopes from a fixed list. |

**Common to all tables:**
- `created_*` and `updated_*` columns are stamped by a trigger, so API callers cannot set or spoof them.
- Metrics, documents, media, evidence and redirects are archived or deactivated, never hard-deleted from the admin.

### Metric references: three separate tables

These tables are deliberately separate, because each tracks a different kind of reference.

| Table | What it tracks | Links to metrics by |
|---|---|---|
| `document_metric_refs` | Figures a document **renders** through a `{{metric:…}}` token | `metric_id` (FK → `metrics.id`) |
| `linked_phrases` | Wording that **restates** a figure (for example "roughly a third") and must be reviewed by hand when it changes | `metric_keys text[]` (values of `metrics.metric_key`) |
| `blocked_phrases` | Wording that must **never** appear (claims ledger) | none |

How `linked_phrases` maps to the existing content model:
- **Rows:** one row per entry in `content/evidence/linked-phrases.ts`, which is exported to the snapshot as `linkedPhrases`.
- **Field mapping:** `location`, `phrase` and `reason` keep their names. `metricIds` becomes `metric_keys`, because the registry ids are the `metric_key` values.
- **Why a key list, not a foreign key:** the rule "every key names an existing metric" is checked on write. Keys can never change, and metrics are archived rather than deleted, so a stored key cannot go stale.
- **Pinning to a field:** `document_id` and `field_path` are optional. Titles, blog copy and multi-field restatements are identified by `location` alone.
- **When review is needed:** `reviewed_at` is null, or any linked metric has a `metric_versions` row newer than `reviewed_at`.

### Human verification, enforced in the database

- `evidence_status` can be chosen when a metric is created. After that it changes only through `set_metric_evidence_status(metric_id, status, reason)`, which requires an admin and a reason.
- `verified_by`, `verified_at`, `verified_value`, `verified_status` and `verification_source` are written only by `confirm_metric_verification(metric_id, note)`. It records the value and status at that moment.
- Changing `value`, `kind`, `formula` or `precision` requires `change_reason` in the same update. The reason is moved into `metric_versions.reason` and is never kept on the row.
- Editing a value never touches the status or the verification record. "Changed since last verified" is therefore always `value <> verified_value`, and the database never grades evidence by itself.
- The trigger refuses direct status or verification writes even if a future migration grants those columns (tested).

---

## 2. Row Level Security

| Role | Access |
|---|---|
| `anon` | No table privileges, no policies, no function execute. Every admin table returns *permission denied*. |
| `authenticated` | Column-level grants for exactly what the admin needs. Every policy is `to authenticated` and gated by `(select private.is_admin())`. |
| `service_role` | Bypasses RLS. Reserved for future server-side publish, import and backup code. Never shipped to a browser. |

**`private.is_admin()`** is true only when both conditions hold:
- the user is in `admin_users`;
- the JWT has `aal = 'aal2'`, meaning the session completed TOTP MFA.

A signed-in user who is not allow-listed sees zero rows. The owner signed in without MFA also sees zero rows.

**What the admin cannot do even with MFA:**
- delete metrics, documents, media, evidence, redirects, history, audit rows or revisions;
- write evidence status or verification fields directly;
- change a `metric_key`, document type or slug;
- set a document's status or published revision;
- create or advance releases;
- read or create service tokens (only their metadata is readable, never the hash);
- add admins.

**The `private` schema:**
- Helper functions live in `private`, which is not in the Data API's exposed schemas and must never be added to them.
- API roles can execute only the pure helpers that policies and checks need.
- The two callable RPCs are `public.set_metric_evidence_status` and `public.confirm_metric_verification`. Both are security definer, check `is_admin()`, and are revoked from `anon`.

---

## 3. Storage

| Bucket | Public | Size limit | MIME types | Object path convention |
|---|---|---|---|---|
| `media-originals` | no | 10 MB | JPEG, PNG, WebP, PDF | `<media_assets.id>/v<version>/<file>` |
| `evidence` | no | 20 MB | CSV, PDF, PNG, JPEG, WebP, XLSX | `<evidence_files.id>/<file>` |

**Policies on `storage.objects`:**
- There are only admin **select** and admin **insert** policies, per bucket, gated by `is_admin()`.
- There is no update or delete policy. Uploads must use `upsert: false`, a replacement is a new object, and removal is a service-role operation.
- The admin views files through short-lived signed URLs.
- Public images on bipinkr.in will be processed copies produced by a later build step, never links into these buckets.
- Evidence never leaves the backend.

---

## 4. Auth assumptions and setup checklist

These are done by the owner in the Supabase dashboard when a project is created. None is done yet.

**Auth settings:**
1. Turn off **Allow new users to sign up**. Keep email/password as the only provider.
2. **Invite** the single admin by email (Authentication → Users → Invite).
3. Set a strong minimum password length (≥ 12). Enable leaked-password protection if the plan allows it.
4. Keep **TOTP MFA** enabled. The admin enrols two authenticator apps or devices, so losing one phone does not lock the account.
5. Set the Site URL and redirect URLs to the future admin origin only.
6. Configure custom SMTP before relying on invite or reset emails. The default sender is rate-limited.

**Grant the owner and keep secrets out:**
7. After the invited user has set a password, run once in the SQL editor:

   ```sql
   select private.grant_admin_owner('<admin email>');
   ```

8. Keys:
   - Never put the `service_role` key, database password or JWT secret in Git, in `NEXT_PUBLIC_*` variables or in the public site.
   - The public site needs no Supabase keys at all.
   - `.env*.local` and Supabase CLI state (`supabase/.temp/`, `supabase/.branches/`, `supabase/.env`, `supabase/seed.sql`) are git-ignored.

**Access rules:**
- The admin UI (later) must require the MFA challenge before showing anything.
- The database already refuses aal1 sessions.

---

## 5. Applying and testing

### Offline: `npm run db:verify`

No Supabase project, Docker or network is needed. The script is [`scripts/db/verify.mjs`](../scripts/db/verify.mjs):

1. Starts an in-memory PGlite database (Postgres 17 in WASM, the `@electric-sql/pglite` devDependency).
2. Loads [`scripts/db/supabase-shim.sql`](../scripts/db/supabase-shim.sql), a minimal stand-in for Supabase's API roles, default grants, `auth.uid()`/`auth.jwt()` and storage tables.
3. Applies every migration in order.
4. Runs `supabase/tests/admin_foundation.test.sql`. Every `test_helpers.expect…` call in the file must report a pass, and the transaction must leave nothing behind.
5. Runs a **negative control**: the same suite with one false expectation added, which must fail.

It exits non-zero on any failure. It is a development tool only. It is not part of `npm run build`, and nothing in the site imports it.

**How the tests run:**
- All tests run in one transaction that ends in `rollback`.
- The fixture users are `@example.test` addresses, not real accounts.
- Any failed expectation raises and aborts the run.

### Against a real Supabase database (later)

Use a **local or throwaway** database only, never production:

```bash
supabase start
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/admin_foundation.test.sql
```

The connection string above is the Supabase CLI's local default, not a credential.

---

## 6. Not in this phase

- **Admin UI:** admin.bipinkr.in, sign-in and MFA challenge screens, metric and content editors, impact preview.
- **Baseline import:** load `snapshot/baseline.json` and the metric registry into these tables. Imported grades use `verification_source = 'legacy_import'`.
- **Publish pipeline:** release creation and validation functions, snapshot generation from the database, GitHub Actions build, Hostinger deploy, deploy report, rollback.
- **Service tokens:** Edge Functions that verify tokens against `service_tokens`; token issuance and rotation.
- **Media:** processing of originals into public copies, signed-URL helpers.
- **Backup and export:** jobs, plus evidence retention reviews.
- **Deferred phases:** Phase 3B preview deployment. Any DNS, hosting or cron change.
