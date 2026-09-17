-- =====================================================================
-- Admin backend foundation · 1 of 7 · access control, audit, shared types
--
-- Nothing in this backend is read by the public website. The site is a
-- static export built from snapshot/baseline.json; these tables exist only
-- for the future admin panel and publish pipeline.
-- =====================================================================

-- Helper functions live in a schema that the Supabase Data API does not expose.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Shared vocabularies — mirror lib/snapshot/schema.ts exactly.
-- ---------------------------------------------------------------------

create type public.evidence_status as enum (
  'documented', 'verified', 'calculated', 'reported', 'unverified', 'limitation', 'recommendation'
);

create type public.metric_kind as enum ('raw', 'calculated', 'legacy_fixed');

create type public.metric_value_type as enum ('currency', 'count', 'percent', 'multiple', 'duration');

create type public.metric_unit as enum (
  'inr', 'lead', 'form_submission', 'click', 'impression', 'conversion', 'result', 'campaign',
  'ad_set', 'ad', 'city', 'objective', 'account', 'conversion_action', 'source', 'percent',
  'multiple', 'month'
);

create type public.metric_display_format as enum (
  'inr', 'inr_whole', 'inr_lakh', 'inr_thousands_1dp', 'inr_thousands_2dp', 'integer',
  'percent_0dp', 'percent_1dp', 'percent_2dp', 'multiple_0dp', 'multiple_1dp', 'months',
  'words', 'words_capitalised'
);

create type public.data_origin as enum ('platform', 'derived', 'owner_confirmed');

create type public.source_platform as enum ('meta_ads', 'google_ads', 'meta_and_google_ads');

create type public.source_type as enum (
  'platform_export', 'platform_diagnostics', 'owner_confirmation', 'calculation'
);

create type public.value_precision as enum ('exact', 'lower_bound', 'rounded_published');

create type public.reporting_period_basis as enum ('not_recorded', 'campaign_start_year', 'export_span');

create type public.verification_source as enum ('admin_confirmation', 'legacy_import');

create type public.document_type as enum (
  'proof_strip', 'homepage', 'about', 'services', 'contact', 'case_study_index', 'case_study',
  'blog_post', 'site_settings'
);

create type public.document_status as enum ('draft', 'published', 'hidden');

create type public.media_kind as enum (
  'profile', 'thumbnail', 'case_study_image', 'screenshot', 'og', 'site', 'document'
);

create type public.release_kind as enum ('publish', 'rollback');

create type public.release_status as enum (
  'validating', 'queued', 'building', 'built', 'deploying', 'live', 'failed', 'superseded'
);

-- ---------------------------------------------------------------------
-- Roles that may write guarded columns: the migration/table owner and the
-- service role (server-side functions, imports). Never `authenticated`.
-- ---------------------------------------------------------------------

create function private.is_trusted_role()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

-- ---------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'owner' check (role = 'owner'),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.admin_users is
  'Users allowed into the admin panel. v1 has exactly one owner; rows are created only by private.grant_admin_owner().';

-- One owner in v1. Adding roles later is a deliberate migration.
create unique index admin_users_single_owner on public.admin_users (role) where role = 'owner';

-- ---------------------------------------------------------------------
-- The access rule used by every policy:
-- an allow-listed user, signed in with a second factor (aal2).
-- ---------------------------------------------------------------------

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1 from public.admin_users au where au.user_id = (select auth.uid())
    );
$$;

comment on function private.is_admin() is
  'True only for an allow-listed admin whose session is MFA-verified (aal2).';

-- ---------------------------------------------------------------------
-- Bootstrap: grant the single owner. Run once from the SQL editor after the
-- user has been invited through Supabase Auth. Not callable by API roles.
-- ---------------------------------------------------------------------

create function private.grant_admin_owner(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not private.is_trusted_role() then
    raise exception 'grant_admin_owner may only be run by a trusted database role';
  end if;

  select u.id into v_user_id from auth.users u where lower(u.email) = lower(p_email);
  if v_user_id is null then
    raise exception 'No auth user with email %; invite the user first', p_email;
  end if;

  insert into public.admin_users (user_id, role) values (v_user_id, 'owner');
  return v_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text not null,
  action      text not null check (btrim(action) <> ''),
  table_name  text,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  detail      jsonb
);

comment on table public.audit_log is
  'Append-only record of admin data changes (row triggers) and explicit admin actions (functions).';

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

-- Blocks UPDATE, DELETE and TRUNCATE on append-only tables for every role.
create function private.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% on %.% is not allowed: this table is append-only', tg_op, tg_table_schema, tg_table_name;
end;
$$;

create trigger audit_log_append_only
  before update or delete on public.audit_log
  for each row execute function private.prevent_mutation();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function private.prevent_mutation();

-- Writes one audit entry. Used by row triggers and by explicit admin actions.
create function private.write_audit(
  p_action text,
  p_table_name text,
  p_record_id text,
  p_old jsonb,
  p_new jsonb,
  p_detail jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (actor_id, actor_role, action, table_name, record_id, old_data, new_data, detail)
  values (
    (select auth.uid()),
    coalesce((select auth.jwt() ->> 'role'), current_user),
    p_action,
    p_table_name,
    p_record_id,
    p_old,
    p_new,
    p_detail
  );
end;
$$;

-- Generic row-change audit trigger. Argument 1 (optional): the primary key column.
-- Secret material is never copied into the log.
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := coalesce(tg_argv[0], 'id');
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'token_hash' end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'token_hash' end;
begin
  perform private.write_audit(
    lower(tg_op),
    tg_table_name,
    coalesce(v_new, v_old) ->> v_key,
    v_old,
    v_new
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Actor and timestamp stamping for tables with created_*/updated_* columns.
-- API callers cannot spoof who created or changed a row.
-- ---------------------------------------------------------------------

create function private.stamp_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_patch jsonb;
begin
  if tg_op = 'INSERT' then
    v_patch := jsonb_build_object('created_at', now(), 'updated_at', now());
    if v_uid is not null or not private.is_trusted_role() then
      v_patch := v_patch || jsonb_build_object('created_by', v_uid, 'updated_by', v_uid);
    end if;
  else
    v_patch := jsonb_build_object(
      'created_at', to_jsonb(old) -> 'created_at',
      'created_by', to_jsonb(old) -> 'created_by',
      'updated_at', now()
    );
    if v_uid is not null or not private.is_trusted_role() then
      v_patch := v_patch || jsonb_build_object('updated_by', v_uid);
    end if;
  end if;
  new := jsonb_populate_record(new, v_patch);
  return new;
end;
$$;

create trigger admin_users_audit
  after insert or update or delete on public.admin_users
  for each row execute function private.audit_row_change('user_id');

-- ---------------------------------------------------------------------
-- Function privileges: nothing in `private` is callable by API roles except
-- the two read-only helpers that policies and invoker triggers need. The
-- schema is not exposed by the Data API, so neither is reachable over HTTP.
-- (Repeated for later functions in the RLS migration.)
-- ---------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_trusted_role() to authenticated;
