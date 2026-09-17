-- =====================================================================
-- Admin backend foundation · 5 of 7 · media and private evidence
--
-- Files live in private Storage buckets (migration 7). These tables hold
-- their metadata. Media originals become public only as processed copies
-- produced by a later build step; evidence files never leave the backend.
-- =====================================================================

create table public.media_assets (
  id                  uuid primary key default gen_random_uuid(),
  bucket_id           text not null default 'media-originals' check (bucket_id = 'media-originals'),
  object_path         text not null unique check (
    object_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' and position('..' in object_path) = 0
  ),
  original_filename   text not null check (btrim(original_filename) <> ''),
  mime_type           text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size           bigint not null check (
    byte_size > 0
    and byte_size <= case when mime_type = 'application/pdf' then 5242880 else 10485760 end
  ),
  width               integer check (width > 0),
  height              integer check (height > 0),
  sha256              text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  kind                public.media_kind not null,
  alt_text            text,
  is_decorative       boolean not null default false,
  caption             text,
  version             integer not null default 1 check (version > 0),
  -- Screenshots must be confirmed free of account IDs, campaign IDs and personal data before use.
  redaction_confirmed boolean not null default false,
  created_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null,
  archived_at         timestamptz,
  archived_by         uuid references auth.users (id) on delete set null,

  constraint media_assets_dimensions_pair check ((width is null) = (height is null))
);

comment on table public.media_assets is
  'Metadata for uploaded media originals (private bucket media-originals).';

create table public.media_usages (
  asset_id    uuid not null references public.media_assets (id) on delete restrict,
  document_id uuid not null references public.documents (id) on delete cascade,
  field_path  text not null check (btrim(field_path) <> ''),
  created_at  timestamptz not null default now(),

  primary key (asset_id, document_id, field_path)
);

create index media_usages_document_idx on public.media_usages (document_id);

create function private.guard_media_asset_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.object_path is distinct from old.object_path
    or new.sha256 is distinct from old.sha256
    or new.mime_type is distinct from old.mime_type
    or new.byte_size is distinct from old.byte_size
  ) then
    raise exception 'A media file cannot be swapped in place; upload a new version instead';
  end if;

  if tg_op = 'UPDATE' and new.archived_at is not null and old.archived_at is null then
    if exists (select 1 from public.media_usages u where u.asset_id = new.id) then
      raise exception 'Media asset % is in use and cannot be archived', new.id;
    end if;
    new.archived_by := coalesce((select auth.uid()), new.archived_by);
  end if;

  return new;
end;
$$;

create trigger media_assets_guard
  before update on public.media_assets
  for each row execute function private.guard_media_asset_change();

create trigger media_assets_stamp
  before insert or update on public.media_assets
  for each row execute function private.stamp_actor();

create trigger media_assets_audit
  after insert or update or delete on public.media_assets
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------
-- Private evidence (exports, CRM extracts, screenshots, business records)
-- ---------------------------------------------------------------------

create table public.evidence_files (
  id                     uuid primary key default gen_random_uuid(),
  bucket_id              text not null default 'evidence' check (bucket_id = 'evidence'),
  object_path            text not null unique check (
    object_path ~ '^[A-Za-z0-9][A-Za-z0-9/_.-]*$' and position('..' in object_path) = 0
  ),
  original_filename      text not null check (btrim(original_filename) <> ''),
  mime_type              text not null check (mime_type in (
    'text/csv', 'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )),
  byte_size              bigint not null check (byte_size > 0 and byte_size <= 20971520),
  sha256                 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  description            text not null check (btrim(description) <> ''),
  contains_personal_data boolean not null default false,
  retention_review_at    date,
  created_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id) on delete set null,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users (id) on delete set null,
  archived_at            timestamptz,
  archived_by            uuid references auth.users (id) on delete set null
);

comment on table public.evidence_files is
  'Private evidence metadata (bucket evidence). Never exported to a snapshot, build or public file.';

create function private.guard_evidence_file_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.object_path is distinct from old.object_path
     or new.sha256 is distinct from old.sha256
     or new.mime_type is distinct from old.mime_type
     or new.byte_size is distinct from old.byte_size then
    raise exception 'An evidence file cannot be swapped in place; upload it as a new file';
  end if;
  if new.archived_at is not null and old.archived_at is null then
    new.archived_by := coalesce((select auth.uid()), new.archived_by);
  end if;
  return new;
end;
$$;

create trigger evidence_files_guard
  before update on public.evidence_files
  for each row execute function private.guard_evidence_file_change();

create trigger evidence_files_stamp
  before insert or update on public.evidence_files
  for each row execute function private.stamp_actor();

create trigger evidence_files_audit
  after insert or update or delete on public.evidence_files
  for each row execute function private.audit_row_change();

create table public.metric_evidence (
  metric_id        uuid not null references public.metrics (id) on delete cascade,
  evidence_file_id uuid not null references public.evidence_files (id) on delete restrict,
  -- Private: where in the file the figure is found.
  locator          text,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,

  primary key (metric_id, evidence_file_id)
);

create index metric_evidence_file_idx on public.metric_evidence (evidence_file_id);

create function private.stamp_link_creator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end;
$$;

create trigger metric_evidence_stamp
  before insert on public.metric_evidence
  for each row execute function private.stamp_link_creator();

create trigger metric_evidence_audit
  after insert or update or delete on public.metric_evidence
  for each row execute function private.audit_row_change('metric_id');
