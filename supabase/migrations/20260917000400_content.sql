-- =====================================================================
-- Admin backend foundation · 4 of 7 · documents, revisions, links
--
-- A document's editable draft lives on the document row. Publishing (a later
-- phase) freezes the draft into an append-only revision and links the
-- revision to its release. Slugs are locked in v1, so public URLs cannot be
-- changed from the admin.
-- =====================================================================

create table public.documents (
  id                    uuid primary key default gen_random_uuid(),
  doc_type              public.document_type not null,
  slug                  text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status                public.document_status not null default 'draft',
  schema_version        integer not null check (schema_version > 0),
  -- Token form, as in snapshot/baseline.json: metric references, never figures.
  draft                 jsonb not null check (jsonb_typeof(draft) = 'object'),
  published_revision_id uuid,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  created_by            uuid references auth.users (id) on delete set null,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references auth.users (id) on delete set null,

  constraint documents_type_slug_key unique (doc_type, slug),
  constraint documents_published_has_revision check (status <> 'published' or published_revision_id is not null)
);

comment on table public.documents is
  'Editable page content (drafts in token form). Status and published revision are set only by the publish pipeline.';

create table public.document_revisions (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.documents (id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  content         jsonb not null check (jsonb_typeof(content) = 'object'),
  schema_version  integer not null check (schema_version > 0),
  change_summary  text,
  release_id      bigint references public.releases (id) on delete restrict,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,

  constraint document_revisions_number_key unique (document_id, revision_number)
);

create index document_revisions_release_idx on public.document_revisions (release_id);

alter table public.documents
  add constraint documents_published_revision_fkey
  foreign key (published_revision_id) references public.document_revisions (id) on delete restrict;

create function private.guard_document_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.doc_type is distinct from old.doc_type or new.slug is distinct from old.slug) then
    raise exception 'Document type and slug cannot change (URLs are locked)';
  end if;

  if new.published_revision_id is not null and (tg_op = 'INSERT' or new.published_revision_id is distinct from old.published_revision_id) then
    if not exists (
      select 1 from public.document_revisions r
      where r.id = new.published_revision_id and r.document_id = new.id
    ) then
      raise exception 'The published revision must belong to this document';
    end if;
  end if;

  return new;
end;
$$;

create trigger documents_guard
  before insert or update on public.documents
  for each row execute function private.guard_document_change();

create trigger documents_stamp
  before insert or update on public.documents
  for each row execute function private.stamp_actor();

create trigger documents_audit
  after insert or update or delete on public.documents
  for each row execute function private.audit_row_change();

-- Revisions: numbered automatically, immutable except for release linking.
create function private.number_document_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select coalesce(max(r.revision_number), 0) + 1
    into new.revision_number
    from public.document_revisions r
   where r.document_id = new.document_id;
  new.created_at := now();
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end;
$$;

create trigger document_revisions_number
  before insert on public.document_revisions
  for each row execute function private.number_document_revision();

create trigger document_revisions_append_only
  before update or delete on public.document_revisions
  for each row execute function private.guard_history_row();

create trigger document_revisions_no_truncate
  before truncate on public.document_revisions
  for each statement execute function private.prevent_mutation();

create trigger document_revisions_audit
  after insert on public.document_revisions
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------
-- Which metrics a document references, and where. Rebuilt from the draft by
-- the admin application; drives the impact preview.
-- ---------------------------------------------------------------------

create table public.document_metric_refs (
  document_id uuid not null references public.documents (id) on delete cascade,
  field_path  text not null check (btrim(field_path) <> ''),
  metric_id   uuid not null references public.metrics (id) on delete restrict,
  format      public.metric_display_format,
  created_at  timestamptz not null default now(),

  primary key (document_id, field_path, metric_id)
);

create index document_metric_refs_metric_idx on public.document_metric_refs (metric_id);

-- A metric referenced by content or by a linked phrase cannot be archived.
create function private.guard_metric_archive_references()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    if exists (select 1 from public.document_metric_refs r where r.metric_id = new.id) then
      raise exception 'Metric % is referenced by page content and cannot be archived', new.metric_key;
    end if;
    if exists (select 1 from public.linked_phrases p where new.metric_key = any (p.metric_keys)) then
      raise exception 'Metric % is referenced by a linked phrase and cannot be archived', new.metric_key;
    end if;
  end if;
  return new;
end;
$$;

create trigger metrics_guard_archive_references
  before update of archived_at on public.metrics
  for each row execute function private.guard_metric_archive_references();

-- ---------------------------------------------------------------------
-- Redirects (empty in v1 — slugs are locked; reserved for later phases)
-- ---------------------------------------------------------------------

create table public.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text not null unique check (from_path ~ '^/[^[:space:]]*$'),
  to_path     text not null check (to_path ~ '^/[^[:space:]]*$'),
  status_code smallint not null default 301 check (status_code in (301, 308)),
  reason      text not null check (btrim(reason) <> ''),
  document_id uuid references public.documents (id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,

  constraint redirects_not_to_self check (from_path <> to_path)
);

create trigger redirects_stamp
  before insert or update on public.redirects
  for each row execute function private.stamp_actor();

create trigger redirects_audit
  after insert or update or delete on public.redirects
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------
-- Linked phrases: wording that restates a metric and needs review when it changes
--
-- One row per entry in content/evidence/linked-phrases.ts (snapshot
-- `linkedPhrases`): location, phrase, metricIds → metric_keys, reason.
-- metric_keys holds metrics.metric_key values (the registry ids), checked on
-- write; a referenced metric cannot be archived. document_id and field_path
-- optionally pin the phrase to a document field. A phrase needs review when
-- reviewed_at is null or any linked metric has a metric_versions row after it.
-- ---------------------------------------------------------------------

create table public.linked_phrases (
  id          uuid primary key default gen_random_uuid(),
  location    text not null check (btrim(location) <> ''),
  document_id uuid references public.documents (id) on delete set null,
  field_path  text,
  phrase      text not null check (btrim(phrase) <> ''),
  metric_keys text[] not null check (cardinality(metric_keys) > 0),
  reason      text not null check (btrim(reason) <> ''),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null,

  constraint linked_phrases_location_phrase_key unique (location, phrase)
);

create index linked_phrases_metric_keys_idx on public.linked_phrases using gin (metric_keys);

create function private.guard_linked_phrase()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing text[];
begin
  select array_agg(k) into v_missing
  from unnest(new.metric_keys) k
  where not exists (select 1 from public.metrics m where m.metric_key = k);

  if v_missing is not null then
    raise exception 'Linked phrase references metrics that do not exist: %', v_missing;
  end if;

  -- The reviewer is whoever marks the review, never a value supplied by the caller.
  if new.reviewed_at is distinct from (case when tg_op = 'UPDATE' then old.reviewed_at end) then
    new.reviewed_by := case when new.reviewed_at is null then null else coalesce((select auth.uid()), new.reviewed_by) end;
  elsif tg_op = 'UPDATE' then
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;

create trigger linked_phrases_guard
  before insert or update on public.linked_phrases
  for each row execute function private.guard_linked_phrase();

create trigger linked_phrases_stamp
  before insert or update on public.linked_phrases
  for each row execute function private.stamp_actor();

create trigger linked_phrases_audit
  after insert or update or delete on public.linked_phrases
  for each row execute function private.audit_row_change();

-- ---------------------------------------------------------------------
-- Release items: what changed in a release (written by the publish pipeline)
-- ---------------------------------------------------------------------

create table public.release_items (
  id                   bigint generated always as identity primary key,
  release_id           bigint not null references public.releases (id) on delete cascade,
  entity_type          text not null check (entity_type in ('metric', 'document', 'media_asset', 'redirect')),
  entity_id            uuid not null,
  metric_version_id    bigint references public.metric_versions (id) on delete restrict,
  document_revision_id uuid references public.document_revisions (id) on delete restrict,
  diff                 jsonb,
  created_at           timestamptz not null default now(),

  constraint release_items_entity_key unique (release_id, entity_type, entity_id),
  constraint release_items_metric_ref check (entity_type = 'metric' or metric_version_id is null),
  constraint release_items_document_ref check (entity_type = 'document' or document_revision_id is null)
);

create trigger release_items_append_only
  before update on public.release_items
  for each row execute function private.prevent_mutation();
