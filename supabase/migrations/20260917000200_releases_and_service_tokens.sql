-- =====================================================================
-- Admin backend foundation · 2 of 7 · releases and service tokens
--
-- The publish pipeline itself is a later phase. These tables fix the shape
-- and the safety rules now: one release in progress at a time, one live
-- release, legal status transitions only, and a frozen snapshot for every
-- release that gets past validation.
-- =====================================================================

create table public.releases (
  id               bigint generated always as identity primary key,
  kind             public.release_kind not null default 'publish',
  status           public.release_status not null default 'validating',
  summary          text not null check (btrim(summary) <> ''),
  -- Public projection only (see lib/snapshot/schema.ts); frozen once queued.
  snapshot         jsonb check (snapshot is null or jsonb_typeof(snapshot) = 'object'),
  snapshot_sha256  text check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  rollback_of      bigint references public.releases (id) on delete restrict,
  github_run_id    text,
  site_commit_sha  text check (site_commit_sha ~ '^[0-9a-f]{7,40}$'),
  failure_stage    text check (failure_stage in ('validate', 'build', 'deploy', 'deploy_verify')),
  failure_message  text,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null,
  built_at         timestamptz,
  live_at          timestamptz,
  failed_at        timestamptz,

  constraint releases_snapshot_frozen check (
    status in ('validating', 'failed') or (snapshot is not null and snapshot_sha256 is not null)
  ),
  constraint releases_rollback_target check ((kind = 'rollback') = (rollback_of is not null)),
  constraint releases_failure_recorded check (
    (status = 'failed') = (failure_stage is not null and failed_at is not null)
  ),
  constraint releases_live_timestamp check (status not in ('live', 'superseded') or live_at is not null)
);

comment on table public.releases is
  'Publish and rollback releases. Created and advanced only by server-side functions, never by the admin UI directly.';

-- At most one release working its way through the pipeline, and one live release.
create unique index releases_one_in_progress on public.releases ((true))
  where status in ('queued', 'building', 'built', 'deploying');
create unique index releases_one_live on public.releases ((true)) where status = 'live';
create index releases_created_at_idx on public.releases (created_at desc);

create function private.enforce_release_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind or new.rollback_of is distinct from old.rollback_of then
    raise exception 'A release''s kind and rollback target cannot change';
  end if;

  if old.status <> 'validating'
     and (new.snapshot is distinct from old.snapshot or new.snapshot_sha256 is distinct from old.snapshot_sha256) then
    raise exception 'A release snapshot is frozen once the release is queued';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'validating' and new.status in ('queued', 'failed')) or
    (old.status = 'queued'     and new.status in ('building', 'failed')) or
    (old.status = 'building'   and new.status in ('built', 'failed')) or
    (old.status = 'built'      and new.status in ('deploying', 'failed')) or
    (old.status = 'deploying'  and new.status in ('live', 'failed')) or
    (old.status = 'live'       and new.status = 'superseded')
  ) then
    raise exception 'Release status cannot change from % to %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger releases_rules
  before update on public.releases
  for each row execute function private.enforce_release_rules();

create trigger releases_stamp
  before insert or update on public.releases
  for each row execute function private.stamp_actor();

create trigger releases_audit
  after insert or update or delete on public.releases
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------
-- Machine tokens for the build, deploy-report and backup jobs.
-- Only a SHA-256 hash is stored; the token itself never enters the database.
-- ---------------------------------------------------------------------

create table public.service_tokens (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (name in ('build', 'deploy_report', 'backup')),
  token_hash  text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes      text[] not null check (
    cardinality(scopes) > 0
    and scopes <@ array['release:read', 'media:sign', 'release:report', 'backup:export']::text[]
  ),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,
  rotated_at  timestamptz,
  revoked_at  timestamptz
);

comment on table public.service_tokens is
  'Hashed machine tokens. The hash is never readable by API roles and is redacted from the audit log.';

create trigger service_tokens_stamp
  before insert or update on public.service_tokens
  for each row execute function private.stamp_actor();

create trigger service_tokens_audit
  after insert or update or delete on public.service_tokens
  for each row execute function private.audit_row_change();
