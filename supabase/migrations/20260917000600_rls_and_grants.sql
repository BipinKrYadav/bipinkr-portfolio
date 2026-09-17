-- =====================================================================
-- Admin backend foundation · 6 of 7 · Row Level Security and privileges
--
-- Model:
--   * anon: no privileges on any admin table and no policies.
--   * authenticated: only the operations the admin panel needs, column by
--     column, and every row gated by private.is_admin() — an allow-listed
--     user with an MFA-verified (aal2) session. Signing in alone grants nothing.
--   * No delete on history, audit, metrics, documents, media or evidence
--     (archive instead). No direct writes to evidence status, verification,
--     document status/publication, releases or service tokens.
--   * service_role (server-side only, never shipped to a browser) bypasses
--     RLS for the future publish, export, import and backup functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enable RLS everywhere
-- ---------------------------------------------------------------------

alter table public.admin_users          enable row level security;
alter table public.audit_log            enable row level security;
alter table public.metrics              enable row level security;
alter table public.metric_versions      enable row level security;
alter table public.metric_evidence      enable row level security;
alter table public.linked_phrases       enable row level security;
alter table public.blocked_phrases      enable row level security;
alter table public.documents            enable row level security;
alter table public.document_revisions   enable row level security;
alter table public.document_metric_refs enable row level security;
alter table public.redirects            enable row level security;
alter table public.media_assets         enable row level security;
alter table public.media_usages         enable row level security;
alter table public.evidence_files       enable row level security;
alter table public.releases             enable row level security;
alter table public.release_items        enable row level security;
alter table public.service_tokens       enable row level security;

-- ---------------------------------------------------------------------
-- 2. Start API roles from zero (Supabase grants broad defaults on new tables)
-- ---------------------------------------------------------------------

revoke all on table
  public.admin_users, public.audit_log, public.metrics, public.metric_versions, public.metric_evidence,
  public.linked_phrases, public.blocked_phrases, public.documents, public.document_revisions,
  public.document_metric_refs, public.redirects, public.media_assets, public.media_usages,
  public.evidence_files, public.releases, public.release_items, public.service_tokens
from anon, authenticated;

revoke all on sequence
  public.audit_log_id_seq, public.metric_versions_id_seq, public.releases_id_seq, public.release_items_id_seq
from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Column-level privileges for authenticated (rows still gated by RLS)
-- ---------------------------------------------------------------------

-- Read-only to the admin
grant select on public.admin_users, public.audit_log, public.metric_versions,
  public.document_revisions, public.releases, public.release_items to authenticated;

-- Token metadata only — never the hash.
grant select (id, name, scopes, created_at, updated_at, rotated_at, revoked_at)
  on public.service_tokens to authenticated;

-- Metrics: evidence_status is choosable at creation; afterwards it and all
-- verified_* columns change only through the explicit functions.
grant select on public.metrics to authenticated;
grant insert (
  metric_key, name, description, kind, value_type, unit, currency, value, precision, display_format,
  formula, evidence_status, data_origin, source_platform, source_type, source_reference,
  attribution_setting, reporting_period_basis, reporting_period_start, reporting_period_end,
  reporting_period_note, public_note, internal_note, legacy_method_note, change_reason
) on public.metrics to authenticated;
grant update (
  name, description, kind, value_type, unit, currency, value, precision, display_format, formula,
  data_origin, source_platform, source_type, source_reference, attribution_setting,
  reporting_period_basis, reporting_period_start, reporting_period_end, reporting_period_note,
  public_note, internal_note, legacy_method_note, change_reason, archived_at
) on public.metrics to authenticated;

grant select, delete on public.metric_evidence to authenticated;
grant insert (metric_id, evidence_file_id, locator) on public.metric_evidence to authenticated;
grant update (locator) on public.metric_evidence to authenticated;

grant select, delete on public.linked_phrases to authenticated;
grant insert (location, document_id, field_path, phrase, metric_keys, reason, reviewed_at)
  on public.linked_phrases to authenticated;
grant update (location, document_id, field_path, phrase, metric_keys, reason, reviewed_at)
  on public.linked_phrases to authenticated;

grant select, delete on public.blocked_phrases to authenticated;
grant insert (phrase, reason), update (phrase, reason) on public.blocked_phrases to authenticated;

-- Documents: drafts only. Status and published revision belong to the publish pipeline.
grant select on public.documents to authenticated;
grant insert (doc_type, slug, schema_version, draft, sort_order) on public.documents to authenticated;
grant update (schema_version, draft, sort_order) on public.documents to authenticated;

grant select, delete on public.document_metric_refs to authenticated;
grant insert (document_id, field_path, metric_id, format) on public.document_metric_refs to authenticated;

-- Redirects are deactivated, not deleted.
grant select on public.redirects to authenticated;
grant insert (from_path, to_path, status_code, reason, document_id, active) on public.redirects to authenticated;
grant update (to_path, status_code, reason, document_id, active) on public.redirects to authenticated;

-- Media and evidence: file identity is fixed at upload; archive instead of delete.
grant select on public.media_assets to authenticated;
grant insert (
  object_path, original_filename, mime_type, byte_size, width, height, sha256, kind, alt_text,
  is_decorative, caption, version, redaction_confirmed
) on public.media_assets to authenticated;
grant update (width, height, alt_text, is_decorative, caption, redaction_confirmed, archived_at)
  on public.media_assets to authenticated;

grant select, delete on public.media_usages to authenticated;
grant insert (asset_id, document_id, field_path) on public.media_usages to authenticated;

grant select on public.evidence_files to authenticated;
grant insert (
  object_path, original_filename, mime_type, byte_size, sha256, description, contains_personal_data,
  retention_review_at
) on public.evidence_files to authenticated;
grant update (description, contains_personal_data, retention_review_at, archived_at)
  on public.evidence_files to authenticated;

-- ---------------------------------------------------------------------
-- 4. Policies — every one requires private.is_admin()
-- ---------------------------------------------------------------------

create policy "Admins can read admin users" on public.admin_users
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read the audit log" on public.audit_log
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read metrics" on public.metrics
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can create metrics" on public.metrics
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update metrics" on public.metrics
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins can read metric versions" on public.metric_versions
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read metric evidence links" on public.metric_evidence
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can link metric evidence" on public.metric_evidence
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update metric evidence links" on public.metric_evidence
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can unlink metric evidence" on public.metric_evidence
  for delete to authenticated using ((select private.is_admin()));

create policy "Admins can read linked phrases" on public.linked_phrases
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can create linked phrases" on public.linked_phrases
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update linked phrases" on public.linked_phrases
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete linked phrases" on public.linked_phrases
  for delete to authenticated using ((select private.is_admin()));

create policy "Admins can read blocked phrases" on public.blocked_phrases
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can create blocked phrases" on public.blocked_phrases
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update blocked phrases" on public.blocked_phrases
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete blocked phrases" on public.blocked_phrases
  for delete to authenticated using ((select private.is_admin()));

create policy "Admins can read documents" on public.documents
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can create documents" on public.documents
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update document drafts" on public.documents
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins can read document revisions" on public.document_revisions
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read document metric references" on public.document_metric_refs
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can add document metric references" on public.document_metric_refs
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can remove document metric references" on public.document_metric_refs
  for delete to authenticated using ((select private.is_admin()));

create policy "Admins can read redirects" on public.redirects
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can create redirects" on public.redirects
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update redirects" on public.redirects
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins can read media assets" on public.media_assets
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can register media assets" on public.media_assets
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update media assets" on public.media_assets
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins can read media usages" on public.media_usages
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can add media usages" on public.media_usages
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can remove media usages" on public.media_usages
  for delete to authenticated using ((select private.is_admin()));

create policy "Admins can read evidence files" on public.evidence_files
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can register evidence files" on public.evidence_files
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update evidence files" on public.evidence_files
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Admins can read releases" on public.releases
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read release items" on public.release_items
  for select to authenticated using ((select private.is_admin()));

create policy "Admins can read service token metadata" on public.service_tokens
  for select to authenticated using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- 5. Functions in `private`: not callable by API roles, except pure helpers
--    that policies, constraints and invoker triggers evaluate.
-- ---------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.is_admin(),
  private.is_trusted_role(),
  private.is_metric_key(jsonb),
  private.is_metric_key_list(jsonb),
  private.is_valid_formula(jsonb),
  private.formula_input_keys(jsonb)
to authenticated;
