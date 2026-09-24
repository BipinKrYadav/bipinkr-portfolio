-- =====================================================================
-- Portfolio admin · Phase 5C · release management and publishing workflow
--
-- The public site is a static export built from a snapshot file. A release
-- is a frozen snapshot, assembled from the current drafts by the database,
-- that goes through an explicit, audited sequence:
--
--   draft ──validate──▶ review ──approve──▶ approved ──start──▶ publishing
--     │                  │                    │                   │
--     └──── cancel ──────┴────── cancel ──────┘      build recorded, deployment
--                                                    confirmed ──▶ published
--                                                    failure   ──▶ failed
--   published ──▶ superseded (a later release went live)
--             ──▶ rolled_back (a rollback release replaced it)
--
-- The snapshot of the one published release is the published baseline. It
-- changes only when another release is marked published; drafts, failed and
-- cancelled releases never touch it. Deployment itself happens outside the
-- database (see scripts/release): "published" records the admin's explicit
-- confirmation that the verified build was deployed, never an automated claim.
--
-- Additive for everything with data. public.releases has never held a row
-- (Phase 3 fixed its shape for this phase), so its unused status vocabulary
-- is replaced; the migration refuses to run if any release exists.
-- =====================================================================

do $$
begin
  if exists (select 1 from public.releases) then
    raise exception 'public.releases is not empty; review the existing releases before applying the Phase 5C lifecycle';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Release lifecycle
-- ---------------------------------------------------------------------

-- Indexes and constraints that name the Phase 3 statuses.
drop index public.releases_one_in_progress;
drop index public.releases_one_live;
alter table public.releases drop constraint releases_snapshot_frozen;
alter table public.releases drop constraint releases_live_timestamp;
alter table public.releases drop constraint releases_failure_recorded;
alter table public.releases alter column status drop default;

-- The Phase 3 vocabulary is kept (renamed, unused) rather than dropped.
alter type public.release_status rename to release_status_phase3;
comment on type public.release_status_phase3 is 'Unused. The Phase 3 release statuses, replaced by public.release_status in Phase 5C.';

create type public.release_status as enum (
  'draft', 'review', 'approved', 'publishing', 'published', 'failed', 'cancelled', 'superseded', 'rolled_back'
);

alter table public.releases
  alter column status type public.release_status using status::text::public.release_status,
  alter column status set default 'draft';

alter table public.releases
  add column origin text not null default 'admin' check (origin in ('admin', 'baseline_import')),
  -- The published release this one was assembled against.
  add column base_release_id bigint references public.releases (id) on delete restrict,
  -- Set when this release goes live: the release that was live just before it.
  add column previous_release_id bigint references public.releases (id) on delete restrict,
  -- Rollback releases: the earlier release whose content they restore.
  add column restores_release_id bigint references public.releases (id) on delete restrict,
  -- document id → the immutable revision whose content this snapshot holds.
  add column document_revisions jsonb not null default '{}'::jsonb check (jsonb_typeof(document_revisions) = 'object'),
  add column validation jsonb check (validation is null or jsonb_typeof(validation) = 'object'),
  add column validated_at timestamptz,
  add column validated_by uuid references auth.users (id) on delete set null,
  add column approved_at timestamptz,
  add column approved_by uuid references auth.users (id) on delete set null,
  add column publish_started_at timestamptz,
  add column publish_started_by uuid references auth.users (id) on delete set null,
  add column build_sha256 text check (build_sha256 ~ '^[0-9a-f]{64}$'),
  add column deployment_confirmed_at timestamptz,
  add column deployment_confirmed_by uuid references auth.users (id) on delete set null,
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users (id) on delete set null,
  add column cancel_reason text;

alter table public.releases
  add constraint releases_snapshot_required check (snapshot is not null and snapshot_sha256 is not null),
  -- Unchanged from Phase 3; re-created against the new status type.
  add constraint releases_failure_recorded check ((status = 'failed') = (failure_stage is not null and failed_at is not null)),
  add constraint releases_live_timestamp check (status not in ('published', 'superseded', 'rolled_back') or live_at is not null),
  add constraint releases_admin_has_base check (origin <> 'admin' or base_release_id is not null),
  add constraint releases_rollback_restores check ((kind = 'rollback') = (restores_release_id is not null)),
  add constraint releases_publish_confirmed check (
    origin = 'baseline_import'
    or status not in ('published', 'superseded', 'rolled_back')
    or (build_sha256 is not null and built_at is not null and deployment_confirmed_at is not null)
  ),
  add constraint releases_cancel_recorded check (
    (status = 'cancelled') = (cancelled_at is not null and cancel_reason is not null and btrim(cancel_reason) <> '')
  );

comment on column public.releases.rollback_of is 'Rollback releases: the published release they undo.';

-- At most one release open (draft to publishing) and one published release.
create unique index releases_one_open on public.releases ((true))
  where status in ('draft', 'review', 'approved', 'publishing');
create unique index releases_one_published on public.releases ((true)) where status = 'published';

-- Replaces the Phase 3 rules. Only the release functions below (security
-- definer, running as a trusted role) ever write this table.
create or replace function private.enforce_release_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_trusted_role() then
    raise exception 'Releases change only through the release functions';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' and new.origin <> 'baseline_import' then
      raise exception 'A new release starts as a draft';
    end if;
    return new;
  end if;

  if new.kind is distinct from old.kind
     or new.origin is distinct from old.origin
     or new.rollback_of is distinct from old.rollback_of
     or new.restores_release_id is distinct from old.restores_release_id
     or new.base_release_id is distinct from old.base_release_id
     or new.summary is distinct from old.summary then
    raise exception 'A release''s kind, origin, summary, base and rollback target cannot change';
  end if;

  if new.snapshot is distinct from old.snapshot
     or new.snapshot_sha256 is distinct from old.snapshot_sha256
     or new.document_revisions is distinct from old.document_revisions then
    raise exception 'A release snapshot is frozen when the release is created';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft'      and new.status in ('review', 'cancelled')) or
    (old.status = 'review'     and new.status in ('approved', 'cancelled')) or
    (old.status = 'approved'   and new.status in ('publishing', 'cancelled')) or
    (old.status = 'publishing' and new.status in ('published', 'failed')) or
    (old.status = 'published'  and new.status in ('superseded', 'rolled_back'))
  ) then
    raise exception 'Release status cannot change from % to %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger releases_rules on public.releases;
create trigger releases_rules
  before insert or update on public.releases
  for each row execute function private.enforce_release_rules();

-- Row audit without the snapshot: it is large, frozen, and already on the row.
create function private.audit_release_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.write_audit(
    lower(tg_op),
    tg_table_name,
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) - 'snapshot' end,
    to_jsonb(new) - 'snapshot'
  );
  return null;
end;
$$;

drop trigger releases_audit on public.releases;
create trigger releases_audit
  after insert or update on public.releases
  for each row execute function private.audit_release_change();

-- Release history is permanent.
create trigger releases_no_delete
  before delete on public.releases
  for each row execute function private.prevent_mutation();
create trigger releases_no_truncate
  before truncate on public.releases
  for each statement execute function private.prevent_mutation();

-- Release items may also describe a change to the linked phrases.
alter table public.release_items drop constraint release_items_entity_type_check;
alter table public.release_items
  add constraint release_items_entity_type_check
  check (entity_type in ('metric', 'document', 'linked_phrases', 'media_asset', 'redirect'));

create trigger release_items_no_delete
  before delete on public.release_items
  for each row execute function private.prevent_mutation();
create trigger release_items_no_truncate
  before truncate on public.release_items
  for each statement execute function private.prevent_mutation();

-- ---------------------------------------------------------------------
-- 2. Snapshot assembly (mirrors lib/snapshot/schema.ts)
-- ---------------------------------------------------------------------

-- The public projection of a metric row (to_jsonb of public.metrics).
create function private.metric_projection(p_row jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_row -> 'metric_key',
    'name', p_row -> 'name',
    'description', p_row -> 'description',
    'kind', p_row -> 'kind',
    'valueType', p_row -> 'value_type',
    'unit', p_row -> 'unit',
    'currency', coalesce(p_row -> 'currency', 'null'::jsonb),
    'value', coalesce(p_row -> 'value', 'null'::jsonb),
    'precision', p_row -> 'precision',
    'displayFormat', p_row -> 'display_format',
    'formula', coalesce(p_row -> 'formula', 'null'::jsonb),
    'evidenceStatus', coalesce(p_row -> 'evidence_status', 'null'::jsonb),
    'dataOrigin', p_row -> 'data_origin',
    'sourcePlatform', coalesce(p_row -> 'source_platform', 'null'::jsonb),
    'sourceType', p_row -> 'source_type',
    'legacyMethodNote', coalesce(p_row -> 'legacy_method_note', 'null'::jsonb),
    'reportingPeriod', jsonb_build_object(
      'basis', p_row -> 'reporting_period_basis',
      'start', coalesce(p_row -> 'reporting_period_start', 'null'::jsonb),
      'end', coalesce(p_row -> 'reporting_period_end', 'null'::jsonb),
      'description', p_row -> 'reporting_period_note'
    )
  );
$$;

-- Where a document sits in the snapshot's `documents` object; null if the
-- snapshot schema has no place for its type.
create function private.snapshot_document_key(p_doc_type public.document_type)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_doc_type
    when 'proof_strip' then 'proofStrip'
    when 'homepage' then 'homepage'
    when 'about' then 'about'
    when 'services' then 'services'
    when 'contact' then 'contact'
    when 'case_study_index' then 'caseStudyIndex'
    when 'case_study' then 'caseStudies'
  end;
$$;

-- Every document of a snapshot as (type, slug, document), collections flattened.
create function private.snapshot_documents(p_snapshot jsonb)
returns table (doc_type text, slug text, document jsonb)
language sql
immutable
set search_path = ''
as $$
  select entry.item ->> 'type', entry.item ->> 'slug', entry.item
    from jsonb_each(coalesce(p_snapshot -> 'documents', '{}'::jsonb)) as entry(key, item)
   where entry.item ? 'type'
  union all
  select inner_entry.item ->> 'type', inner_entry.item ->> 'slug', inner_entry.item
    from jsonb_each(coalesce(p_snapshot -> 'documents', '{}'::jsonb)) as entry(key, item)
    cross join lateral jsonb_each(entry.item) as inner_entry(key, item)
   where not (entry.item ? 'type') and jsonb_typeof(entry.item) = 'object';
$$;

-- The snapshot the current drafts would publish. Order follows the base
-- snapshot (new metrics and phrases last), and media is carried over: the
-- admin does not edit media yet.
create function private.compose_release_snapshot(p_base jsonb, p_description text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with base_metrics as (
    select element.item ->> 'id' as metric_key, element.position
      from jsonb_array_elements(coalesce(p_base -> 'metrics', '[]'::jsonb)) with ordinality as element(item, position)
  ),
  base_phrases as (
    select element.item ->> 'location' as location, element.item ->> 'phrase' as phrase, element.position
      from jsonb_array_elements(coalesce(p_base -> 'linkedPhrases', '[]'::jsonb)) with ordinality as element(item, position)
  ),
  document_rows as (
    select d.doc_type, d.slug, d.sort_order,
           private.snapshot_document_key(d.doc_type) as snapshot_key,
           jsonb_build_object('type', d.doc_type, 'slug', d.slug, 'status', 'published',
                              'schemaVersion', d.schema_version, 'content', d.draft) as document
      from public.documents d
     where private.snapshot_document_key(d.doc_type) is not null and d.status <> 'hidden'
  )
  select jsonb_build_object(
    'schemaVersion', 1,
    'kind', 'release',
    'description', p_description,
    'metrics', (
      select coalesce(jsonb_agg(private.metric_projection(to_jsonb(m)) order by b.position nulls last, m.metric_key), '[]'::jsonb)
        from public.metrics m
        left join base_metrics b on b.metric_key = m.metric_key
       where m.archived_at is null
    ),
    'linkedPhrases', (
      select coalesce(jsonb_agg(
               jsonb_build_object('location', p.location, 'phrase', p.phrase, 'metricIds', to_jsonb(p.metric_keys), 'reason', p.reason)
               order by b.position nulls last, p.location, p.phrase), '[]'::jsonb)
        from public.linked_phrases p
        left join base_phrases b on b.location = p.location and b.phrase = p.phrase
    ),
    'media', coalesce(p_base -> 'media', '[]'::jsonb),
    'documents', (
      select coalesce(jsonb_object_agg(r.snapshot_key, r.document), '{}'::jsonb)
        from document_rows r where r.snapshot_key <> 'caseStudies'
    ) || (
      select case when count(*) = 0 then '{}'::jsonb
                  else jsonb_build_object('caseStudies', jsonb_object_agg(r.slug, r.document)) end
        from document_rows r where r.snapshot_key = 'caseStudies'
    )
  );
$$;

-- The parts of a snapshot that are published content (not its label).
create function private.snapshot_content(p_snapshot jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select p_snapshot - 'description' - 'kind';
$$;

create function private.snapshot_sha256(p_snapshot jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex');
$$;

-- Dot paths (array indices included) at which two JSON values differ.
create function private.jsonb_diff_paths(p_before jsonb, p_after jsonb, p_path text default '')
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  paths text[] := array[]::text[];
  item_key text;
  item_index integer;
begin
  if p_before is not distinct from p_after then
    return paths;
  end if;

  if jsonb_typeof(p_before) = 'object' and jsonb_typeof(p_after) = 'object' then
    for item_key in
      select key_list.key
        from (select jsonb_object_keys(p_before) as key union select jsonb_object_keys(p_after)) as key_list
       order by key_list.key
    loop
      paths := paths || private.jsonb_diff_paths(
        p_before -> item_key, p_after -> item_key,
        case when p_path = '' then item_key else p_path || '.' || item_key end
      );
    end loop;
    return paths;
  end if;

  if jsonb_typeof(p_before) = 'array' and jsonb_typeof(p_after) = 'array' then
    for item_index in 0 .. greatest(jsonb_array_length(p_before), jsonb_array_length(p_after)) - 1 loop
      paths := paths || private.jsonb_diff_paths(
        p_before -> item_index, p_after -> item_index,
        case when p_path = '' then item_index::text else p_path || '.' || item_index end
      );
    end loop;
    return paths;
  end if;

  return array[case when p_path = '' then '(whole value)' else p_path end];
end;
$$;

-- What changes between two snapshots, entity by entity.
create function private.snapshot_changes(p_before jsonb, p_after jsonb)
returns table (entity_type text, entity_key text, change text, fields text[], before_value jsonb, after_value jsonb)
language sql
immutable
set search_path = ''
as $$
  with before_metrics as (
    select element.item ->> 'id' as metric_key, element.item
      from jsonb_array_elements(coalesce(p_before -> 'metrics', '[]'::jsonb)) as element(item)
  ),
  after_metrics as (
    select element.item ->> 'id' as metric_key, element.item
      from jsonb_array_elements(coalesce(p_after -> 'metrics', '[]'::jsonb)) as element(item)
  ),
  before_documents as (select * from private.snapshot_documents(p_before)),
  after_documents as (select * from private.snapshot_documents(p_after)),
  before_phrases as (
    select element.item ->> 'location' as location, element.item ->> 'phrase' as phrase, element.item
      from jsonb_array_elements(coalesce(p_before -> 'linkedPhrases', '[]'::jsonb)) as element(item)
  ),
  after_phrases as (
    select element.item ->> 'location' as location, element.item ->> 'phrase' as phrase, element.item
      from jsonb_array_elements(coalesce(p_after -> 'linkedPhrases', '[]'::jsonb)) as element(item)
  ),
  phrase_changes as (
    select coalesce(a.location, b.location) || ' › ' || coalesce(a.phrase, b.phrase) as label
      from before_phrases b
      full join after_phrases a on a.location = b.location and a.phrase = b.phrase
     where b.item is distinct from a.item
  )
  select 'metric',
         coalesce(a.metric_key, b.metric_key),
         case when b.item is null then 'added' when a.item is null then 'removed' else 'changed' end,
         private.jsonb_diff_paths(b.item, a.item),
         b.item,
         a.item
    from before_metrics b
    full join after_metrics a on a.metric_key = b.metric_key
   where b.item is distinct from a.item
  union all
  select 'document',
         coalesce(a.doc_type, b.doc_type) || '/' || coalesce(a.slug, b.slug),
         case when b.document is null then 'added' when a.document is null then 'removed' else 'changed' end,
         private.jsonb_diff_paths(b.document, a.document),
         null,
         null
    from before_documents b
    full join after_documents a on a.doc_type = b.doc_type and a.slug = b.slug
   where b.document is distinct from a.document
  union all
  select 'linked_phrases', 'linked_phrases', 'changed', array_agg(label order by label), null, null
    from phrase_changes
  having count(*) > 0;
$$;

-- Every metric key a document value references, as the build resolves them:
-- {{metric:…}}, {{evidence:…}}, $metricValue and $pair. Raises on a
-- malformed token (private.collect_document_tokens).
create function private.document_metric_keys(p_content jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct found.key order by found.key), array[]::text[])
    from unnest(private.collect_document_tokens(p_content)) as token(pair)
    cross join lateral (
      select (regexp_match(token.pair ->> 1, '^\{\{metric:([^|{}]+)'))[1] as key
      union all
      select (regexp_match(token.pair ->> 1, '^\{\{evidence:([^|{}]+)\}\}$'))[1]
      union all
      select (regexp_match(token.pair ->> 1, '^\$metricValue:(.+)$'))[1]
      union all
      select unnest(regexp_split_to_array((regexp_match(token.pair ->> 1, '^\$pair:(.+)$'))[1], ':'))
    ) as found
   where found.key is not null;
$$;

-- Protected tokens of a document, as the sorted multiset save_document_draft compares.
create function private.document_token_multiset(p_content jsonb)
returns jsonb[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(token order by token), array[]::jsonb[])
    from unnest(private.collect_document_tokens(p_content)) as token;
$$;

-- document id → latest revision id, for the documents a snapshot contains.
create function private.current_document_revisions()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(d.id::text, latest.id::text), '{}'::jsonb)
    from public.documents d
    cross join lateral (
      select r.id from public.document_revisions r
       where r.document_id = d.id
       order by r.revision_number desc
       limit 1
    ) as latest
   where private.snapshot_document_key(d.doc_type) is not null and d.status <> 'hidden';
$$;

-- ---------------------------------------------------------------------
-- 3. Shared guards
-- ---------------------------------------------------------------------

create function private.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'MFA-verified admin access is required' using errcode = '42501';
  end if;
end;
$$;

-- The one release currently published, or null.
create function private.published_release()
returns public.releases
language sql
stable
security definer
set search_path = ''
as $$
  select r.* from public.releases r where r.status = 'published';
$$;

-- Locks a release for a transition; refuses a stale copy (optimistic concurrency).
create function private.lock_release(p_release_id bigint, p_expected_updated_at timestamptz)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_release public.releases;
begin
  perform private.require_admin();
  select * into found_release from public.releases where id = p_release_id for update;
  if found_release.id is null then
    raise exception 'Release % not found', p_release_id;
  end if;
  if found_release.updated_at is distinct from p_expected_updated_at then
    raise exception 'Release % changed after you opened it. Reload before continuing.', p_release_id;
  end if;
  return found_release;
end;
$$;

-- The release was assembled against the release that is still published.
create function private.require_current_base(p_release public.releases)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  published public.releases := private.published_release();
begin
  if published.id is null or published.id is distinct from p_release.base_release_id then
    raise exception 'Release % was prepared against release %, but release % is now published. Cancel it and create a new release.',
      p_release.id, p_release.base_release_id, coalesce(published.id::text, 'none');
  end if;
end;
$$;

-- Writes release_items for a new release from the differences to its base.
create function private.record_release_items(p_release public.releases, p_base jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  change record;
  item_count integer := 0;
  entity uuid;
  version_id bigint;
  revision_id uuid;
begin
  for change in select * from private.snapshot_changes(p_base, p_release.snapshot) loop
    entity := null;
    version_id := null;
    revision_id := null;

    if change.entity_type = 'metric' then
      select m.id into entity from public.metrics m where m.metric_key = change.entity_key;
      if p_release.kind = 'publish' and entity is not null then
        select max(v.id) into version_id from public.metric_versions v where v.metric_id = entity;
      end if;
    elsif change.entity_type = 'document' then
      select d.id into entity from public.documents d
       where d.doc_type::text || '/' || d.slug = change.entity_key;
      if entity is not null then
        revision_id := (p_release.document_revisions ->> entity::text)::uuid;
      end if;
    end if;

    insert into public.release_items (release_id, entity_type, entity_id, metric_version_id, document_revision_id, diff)
    values (
      p_release.id,
      change.entity_type,
      coalesce(entity, '00000000-0000-0000-0000-000000000000'::uuid),
      version_id,
      revision_id,
      jsonb_build_object(
        'entityKey', change.entity_key,
        'change', change.change,
        'fields', to_jsonb(change.fields),
        'before', change.before_value,
        'after', change.after_value
      )
    );
    item_count := item_count + 1;
  end loop;
  return item_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Admin functions (Data API RPCs). Each checks for an MFA-verified admin.
-- ---------------------------------------------------------------------

-- What a release created now would contain. Writes nothing.
create function public.preview_release_changes()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  published public.releases;
  next_snapshot jsonb;
begin
  perform private.require_admin();
  published := private.published_release();
  if published.id is null then
    return jsonb_build_object('baseReleaseId', null, 'items', '[]'::jsonb);
  end if;

  next_snapshot := private.compose_release_snapshot(published.snapshot, 'preview');
  return jsonb_build_object(
    'baseReleaseId', published.id,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'entityType', c.entity_type, 'entityKey', c.entity_key, 'change', c.change, 'fields', to_jsonb(c.fields))
               order by c.entity_type, c.entity_key), '[]'::jsonb)
        from private.snapshot_changes(published.snapshot, next_snapshot) as c
    )
  );
end;
$$;

create function public.create_release(p_summary text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.releases;
  open_release public.releases;
  next_snapshot jsonb;
  created public.releases;
  item_count integer;
begin
  perform private.require_admin();
  if p_summary is null or btrim(p_summary) = '' then
    raise exception 'A release summary is required';
  end if;

  published := private.published_release();
  if published.id is null then
    raise exception 'No release is published yet. Import the published baseline before creating a release.';
  end if;

  select * into open_release from public.releases
   where status in ('draft', 'review', 'approved', 'publishing') limit 1;
  if open_release.id is not null then
    raise exception 'Release % is still open (%). Publish or cancel it before creating another.', open_release.id, open_release.status;
  end if;

  next_snapshot := private.compose_release_snapshot(published.snapshot, btrim(p_summary));
  if private.snapshot_content(next_snapshot) = private.snapshot_content(published.snapshot) then
    raise exception 'There are no draft changes to release';
  end if;

  insert into public.releases (kind, status, summary, snapshot, snapshot_sha256, base_release_id, document_revisions)
  values ('publish', 'draft', btrim(p_summary), next_snapshot, private.snapshot_sha256(next_snapshot),
          published.id, private.current_document_revisions())
  returning * into created;

  item_count := private.record_release_items(created, published.snapshot);

  perform private.write_audit('release_created', 'releases', created.id::text, null, null, jsonb_build_object(
    'kind', created.kind, 'base_release_id', published.id, 'items', item_count, 'snapshot_sha256', created.snapshot_sha256));
  return created;
end;
$$;

-- Runs every database check and records the result. A release that passes
-- moves to review; one that fails stays a draft with the reasons attached.
-- p_schema_issues: the schema check the admin ran on this snapshot
-- (lib/snapshot/parse.ts); the release build runs it again before building.
create function public.validate_release(p_release_id bigint, p_expected_updated_at timestamptz, p_schema_issues jsonb)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  published public.releases;
  base_snapshot jsonb;
  checks jsonb := '[]'::jsonb;
  details text[];
  passed boolean;
  document_row record;
  metric_row record;
  base_tokens jsonb[];
  next_tokens jsonb[];
  known_keys text[];
  referenced text[];
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'draft' then
    raise exception 'Only a draft release can be validated; release % is %', target.id, target.status;
  end if;
  published := private.published_release();
  select r.snapshot into base_snapshot from public.releases r where r.id = target.base_release_id;

  -- 1. At least one real change.
  details := array(select c.entity_type || ' ' || c.entity_key from private.snapshot_changes(base_snapshot, target.snapshot) as c);
  checks := checks || jsonb_build_object('code', 'has_changes', 'label', 'The release changes something',
    'ok', cardinality(details) > 0, 'details', to_jsonb(details));

  -- 2. Still based on the published release.
  checks := checks || jsonb_build_object('code', 'current_base', 'label', 'Prepared against the release that is published now',
    'ok', published.id is not distinct from target.base_release_id,
    'details', to_jsonb(array['published release ' || coalesce(published.id::text, 'none'), 'base release ' || target.base_release_id]));

  -- 3. The snapshot is still what the drafts say (publish), or still the restored release (rollback).
  if target.kind = 'publish' then
    checks := checks || jsonb_build_object('code', 'drafts_unchanged', 'label', 'No draft changed after the release was created',
      'ok', private.snapshot_content(private.compose_release_snapshot(base_snapshot, target.summary)) = private.snapshot_content(target.snapshot)
            and private.current_document_revisions() = target.document_revisions,
      'details', '[]'::jsonb);
  else
    checks := checks || jsonb_build_object('code', 'restores_release', 'label', 'The snapshot is exactly the release being restored',
      'ok', (select private.snapshot_content(r.snapshot) from public.releases r where r.id = target.restores_release_id)
            = private.snapshot_content(target.snapshot),
      'details', to_jsonb(array['restores release ' || target.restores_release_id]));
  end if;

  -- 4. Protected tokens: every document keeps the published document's tokens, in the same fields.
  details := array[]::text[];
  for document_row in
    select after_doc.doc_type, after_doc.slug, after_doc.document -> 'content' as after_content, before_doc.document -> 'content' as before_content
      from private.snapshot_documents(target.snapshot) as after_doc
      left join private.snapshot_documents(base_snapshot) as before_doc
        on before_doc.doc_type = after_doc.doc_type and before_doc.slug = after_doc.slug
  loop
    begin
      next_tokens := private.document_token_multiset(document_row.after_content);
      if document_row.before_content is not null then
        base_tokens := private.document_token_multiset(document_row.before_content);
        if base_tokens <> next_tokens then
          details := details || (document_row.doc_type || '/' || document_row.slug || ': protected tokens differ from the published document');
        end if;
      end if;
    exception when others then
      details := details || (document_row.doc_type || '/' || document_row.slug || ': ' || sqlerrm);
    end;
  end loop;
  checks := checks || jsonb_build_object('code', 'protected_tokens', 'label', 'Protected metric, evidence and label tokens are unchanged',
    'ok', cardinality(details) = 0, 'details', to_jsonb(details));

  -- 5. Metric references: well-formed, known, and not archived.
  known_keys := array(select element.item ->> 'id' from jsonb_array_elements(target.snapshot -> 'metrics') as element(item));
  details := array[]::text[];
  for document_row in select d.doc_type, d.slug, d.document -> 'content' as content from private.snapshot_documents(target.snapshot) as d loop
    begin
      referenced := private.document_metric_keys(document_row.content);
    exception when others then
      referenced := array[]::text[];
      details := details || (document_row.doc_type || '/' || document_row.slug || ': ' || sqlerrm);
    end;
    details := details || array(
      select document_row.doc_type || '/' || document_row.slug || ': ' ||
             case
               when not private.is_metric_key(to_jsonb(k)) then 'malformed metric reference "' || k || '"'
               when exists (select 1 from public.metrics m where m.metric_key = k and m.archived_at is not null) then 'references archived metric ' || k
               else 'references unknown metric ' || k
             end
        from unnest(referenced) as k
       where not (k = any (known_keys))
    );
  end loop;
  details := details || array(
    select 'linked phrase "' || (element.item ->> 'phrase') || '": references ' ||
           case when exists (select 1 from public.metrics m where m.metric_key = k and m.archived_at is not null) then 'archived' else 'unknown' end ||
           ' metric ' || k
      from jsonb_array_elements(target.snapshot -> 'linkedPhrases') as element(item)
      cross join lateral jsonb_array_elements_text(element.item -> 'metricIds') as k
     where not (k = any (known_keys))
  );
  checks := checks || jsonb_build_object('code', 'metric_references', 'label', 'Every metric reference is well-formed, known and active',
    'ok', cardinality(details) = 0, 'details', to_jsonb(details));

  -- 6. No duplicated structure: metric ids, documents, linked phrases.
  details := array(
    select 'duplicate metric ' || k from (
      select element.item ->> 'id' as k from jsonb_array_elements(target.snapshot -> 'metrics') as element(item)
    ) ids group by k having count(*) > 1
    union all
    select 'duplicate document ' || d.doc_type || '/' || d.slug from private.snapshot_documents(target.snapshot) d
     group by d.doc_type, d.slug having count(*) > 1
    union all
    select 'duplicate linked phrase ' || (element.item ->> 'location') || ' › ' || (element.item ->> 'phrase')
      from jsonb_array_elements(target.snapshot -> 'linkedPhrases') as element(item)
     group by element.item ->> 'location', element.item ->> 'phrase' having count(*) > 1
  );
  checks := checks || jsonb_build_object('code', 'no_duplicates', 'label', 'No duplicate metrics, documents or linked phrases',
    'ok', cardinality(details) = 0, 'details', to_jsonb(details));

  -- 7. Required fields, per metric kind; supported document schema version.
  details := array[]::text[];
  for metric_row in select element.item as m from jsonb_array_elements(target.snapshot -> 'metrics') as element(item) loop
    if btrim(coalesce(metric_row.m ->> 'name', '')) = '' or btrim(coalesce(metric_row.m ->> 'description', '')) = '' then
      details := details || (metric_row.m ->> 'id' || ': name and description are required');
    end if;
    if btrim(coalesce(metric_row.m #>> '{reportingPeriod,description}', '')) = '' then
      details := details || (metric_row.m ->> 'id' || ': the reporting period note is required');
    end if;
    case metric_row.m ->> 'kind'
      when 'raw' then
        if jsonb_typeof(metric_row.m -> 'formula') <> 'null' or jsonb_typeof(metric_row.m -> 'legacyMethodNote') <> 'null' then
          details := details || (metric_row.m ->> 'id' || ': a raw metric has no formula or legacy note');
        end if;
      when 'calculated' then
        if jsonb_typeof(metric_row.m -> 'value') <> 'null' or not private.is_valid_formula(metric_row.m -> 'formula') then
          details := details || (metric_row.m ->> 'id' || ': a calculated metric needs a valid formula and no stored value');
        end if;
      when 'legacy_fixed' then
        if jsonb_typeof(metric_row.m -> 'value') <> 'number' or btrim(coalesce(metric_row.m ->> 'legacyMethodNote', '')) = '' then
          details := details || (metric_row.m ->> 'id' || ': a legacy metric needs a value and a method note');
        end if;
      else
        details := details || (metric_row.m ->> 'id' || ': unknown kind');
    end case;
  end loop;
  details := details || array(
    select d.doc_type || '/' || d.slug || ': schema version ' || coalesce(d.document ->> 'schemaVersion', 'missing') || ' is not supported'
      from private.snapshot_documents(target.snapshot) d
     where (d.document ->> 'schemaVersion') is distinct from '1'
  );
  details := details || array(
    select d.doc_type::text || '/' || d.slug || ': this document type cannot be published yet'
      from public.documents d
     where private.snapshot_document_key(d.doc_type) is null and d.status = 'published'
  );
  checks := checks || jsonb_build_object('code', 'required_fields', 'label', 'Required fields are present and valid',
    'ok', cardinality(details) = 0, 'details', to_jsonb(details));

  -- 8. The admin's schema check against lib/snapshot/schema.ts.
  checks := checks || jsonb_build_object('code', 'document_schema', 'label', 'The snapshot conforms to the published schema (checked in the admin, repeated by the build)',
    'ok', jsonb_typeof(p_schema_issues) = 'array' and jsonb_array_length(p_schema_issues) = 0,
    'details', case when jsonb_typeof(p_schema_issues) = 'array' then p_schema_issues else '["no schema result was supplied"]'::jsonb end);

  passed := not exists (select 1 from jsonb_array_elements(checks) as c(item) where (c.item ->> 'ok')::boolean is not true);

  update public.releases
     set validation = jsonb_build_object('passed', passed, 'checkedAt', now(), 'snapshotSha256', target.snapshot_sha256, 'checks', checks),
         validated_at = now(),
         validated_by = (select auth.uid()),
         status = case when passed then 'review'::public.release_status else status end
   where id = target.id
   returning * into saved;

  perform private.write_audit('release_validated', 'releases', target.id::text, null, null, jsonb_build_object(
    'passed', passed,
    'failed_checks', (select coalesce(jsonb_agg(c.item ->> 'code'), '[]'::jsonb) from jsonb_array_elements(checks) as c(item)
                       where (c.item ->> 'ok')::boolean is not true)));
  return saved;
end;
$$;

-- The admin approves exactly the snapshot they reviewed (by its SHA-256).
create function public.approve_release(p_release_id bigint, p_expected_updated_at timestamptz, p_snapshot_sha256 text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'review' then
    raise exception 'Only a release in review can be approved; release % is %', target.id, target.status;
  end if;
  if coalesce((target.validation ->> 'passed')::boolean, false) is not true then
    raise exception 'Release % has not passed validation', target.id;
  end if;
  if p_snapshot_sha256 is distinct from target.snapshot_sha256 then
    raise exception 'The reviewed snapshot does not match release %. Reload and review it again.', target.id;
  end if;
  perform private.require_current_base(target);

  update public.releases
     set status = 'approved', approved_at = now(), approved_by = (select auth.uid())
   where id = target.id
   returning * into saved;

  perform private.write_audit('release_approved', 'releases', target.id::text, null, null,
    jsonb_build_object('snapshot_sha256', target.snapshot_sha256));
  return saved;
end;
$$;

-- Confirm publish: the release may now be built and deployed.
create function public.start_release_publish(p_release_id bigint, p_expected_updated_at timestamptz)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'approved' then
    raise exception 'Only an approved release can start publishing; release % is %', target.id, target.status;
  end if;
  perform private.require_current_base(target);

  update public.releases
     set status = 'publishing', publish_started_at = now(), publish_started_by = (select auth.uid())
   where id = target.id
   returning * into saved;

  perform private.write_audit(
    case when target.kind = 'rollback' then 'rollback_started' else 'publish_started' end,
    'releases', target.id::text, null, null,
    jsonb_build_object('snapshot_sha256', target.snapshot_sha256, 'base_release_id', target.base_release_id,
                       'restores_release_id', target.restores_release_id));
  return saved;
end;
$$;

-- Records the verified build (SHA-256 of the site archive the release build produced).
create function public.record_release_build(p_release_id bigint, p_expected_updated_at timestamptz, p_build_sha256 text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'publishing' then
    raise exception 'A build can be recorded only while release % is publishing; it is %', target.id, target.status;
  end if;
  if p_build_sha256 is null or p_build_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'The build SHA-256 must be 64 lowercase hexadecimal characters';
  end if;

  update public.releases
     set build_sha256 = p_build_sha256, built_at = now()
   where id = target.id
   returning * into saved;

  perform private.write_audit('release_build_verified', 'releases', target.id::text, null, null,
    jsonb_build_object('build_sha256', p_build_sha256));
  return saved;
end;
$$;

-- Mark published: only after the verified build is recorded and the admin
-- confirms it was deployed. The previous release is superseded (or rolled
-- back), history rows are linked, and documents point at the published revisions.
create function public.mark_release_published(p_release_id bigint, p_expected_updated_at timestamptz, p_deployment_confirmed boolean)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  previous public.releases;
  saved public.releases;
  entry record;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'publishing' then
    raise exception 'Only a publishing release can be marked published; release % is %', target.id, target.status;
  end if;
  if target.build_sha256 is null then
    raise exception 'Record the verified build of release % before marking it published', target.id;
  end if;
  if p_deployment_confirmed is not true then
    raise exception 'Confirm that the verified build of release % was deployed', target.id;
  end if;
  perform private.require_current_base(target);

  select * into previous from public.releases where id = target.base_release_id for update;
  update public.releases
     set status = case when target.kind = 'rollback' and target.rollback_of = previous.id
                       then 'rolled_back'::public.release_status else 'superseded'::public.release_status end
   where id = previous.id;

  update public.releases
     set status = 'published',
         live_at = now(),
         previous_release_id = previous.id,
         deployment_confirmed_at = now(),
         deployment_confirmed_by = (select auth.uid())
   where id = target.id
   returning * into saved;

  -- Link the history rows this release published (unlinked rows only).
  update public.metric_versions v
     set release_id = target.id
    from public.release_items i
   where i.release_id = target.id and i.metric_version_id = v.id and v.release_id is null;

  for entry in select key::uuid as document_id, value::uuid as revision_id from jsonb_each_text(target.document_revisions) loop
    update public.document_revisions set release_id = target.id where id = entry.revision_id and release_id is null;
    update public.documents
       set published_revision_id = entry.revision_id, status = 'published'
     where id = entry.document_id
       and (published_revision_id is distinct from entry.revision_id or status <> 'published');
  end loop;

  perform private.write_audit(
    case when target.kind = 'rollback' then 'rollback_succeeded' else 'publish_succeeded' end,
    'releases', target.id::text, null, null,
    jsonb_build_object('previous_release_id', previous.id, 'snapshot_sha256', target.snapshot_sha256,
                       'build_sha256', target.build_sha256, 'deployment', 'confirmed by admin'));
  return saved;
end;
$$;

-- A failed publish or rollback. The published release and the documents are untouched.
create function public.record_release_failure(p_release_id bigint, p_expected_updated_at timestamptz, p_stage text, p_message text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status <> 'publishing' then
    raise exception 'Only a publishing release can fail; release % is %', target.id, target.status;
  end if;
  if p_stage is null or p_stage not in ('build', 'deploy', 'deploy_verify') then
    raise exception 'The failure stage must be build, deploy or deploy_verify';
  end if;
  if p_message is null or btrim(p_message) = '' then
    raise exception 'Describe what failed';
  end if;

  update public.releases
     set status = 'failed', failure_stage = p_stage, failure_message = btrim(p_message), failed_at = now()
   where id = target.id
   returning * into saved;

  perform private.write_audit(
    case when target.kind = 'rollback' then 'rollback_failed' else 'publish_failed' end,
    'releases', target.id::text, null, null,
    jsonb_build_object('stage', p_stage, 'message', btrim(p_message), 'published_release_id', (private.published_release()).id));
  return saved;
end;
$$;

create function public.cancel_release(p_release_id bigint, p_expected_updated_at timestamptz, p_reason text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.releases;
  saved public.releases;
begin
  target := private.lock_release(p_release_id, p_expected_updated_at);
  if target.status not in ('draft', 'review', 'approved') then
    raise exception 'Release % is % and cannot be cancelled', target.id, target.status;
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to cancel a release';
  end if;

  update public.releases
     set status = 'cancelled', cancelled_at = now(), cancelled_by = (select auth.uid()), cancel_reason = btrim(p_reason)
   where id = target.id
   returning * into saved;

  perform private.write_audit('release_cancelled', 'releases', target.id::text, null, null, jsonb_build_object('reason', btrim(p_reason)));
  return saved;
end;
$$;

-- A rollback release: restores the most recent earlier published state that
-- differs from what is live. Drafts are not touched; it goes through the
-- same validate → review → approve → publish sequence.
create function public.create_rollback_release(p_summary text)
returns public.releases
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.releases;
  candidate public.releases;
  open_release public.releases;
  restored_snapshot jsonb;
  created public.releases;
  item_count integer;
  guard integer := 0;
begin
  perform private.require_admin();
  if p_summary is null or btrim(p_summary) = '' then
    raise exception 'A rollback summary is required';
  end if;

  published := private.published_release();
  if published.id is null then
    raise exception 'No release is published, so there is nothing to roll back';
  end if;

  select * into open_release from public.releases
   where status in ('draft', 'review', 'approved', 'publishing') limit 1;
  if open_release.id is not null then
    raise exception 'Release % is still open (%). Publish or cancel it before creating a rollback.', open_release.id, open_release.status;
  end if;

  select * into candidate from public.releases where id = published.previous_release_id;
  while candidate.id is not null loop
    guard := guard + 1;
    exit when guard > 1000;
    exit when candidate.status = 'superseded'
          and private.snapshot_content(candidate.snapshot) <> private.snapshot_content(published.snapshot);
    select * into candidate from public.releases where id = candidate.previous_release_id;
  end loop;
  if candidate.id is null or guard > 1000 then
    raise exception 'There is no earlier published state to roll back to';
  end if;

  restored_snapshot := jsonb_set(jsonb_set(candidate.snapshot, '{kind}', '"release"'), '{description}', to_jsonb(btrim(p_summary)));

  insert into public.releases (kind, status, summary, snapshot, snapshot_sha256, base_release_id, rollback_of,
                               restores_release_id, document_revisions)
  values ('rollback', 'draft', btrim(p_summary), restored_snapshot, private.snapshot_sha256(restored_snapshot),
          published.id, published.id, candidate.id, candidate.document_revisions)
  returning * into created;

  item_count := private.record_release_items(created, published.snapshot);

  perform private.write_audit('release_created', 'releases', created.id::text, null, null, jsonb_build_object(
    'kind', 'rollback', 'base_release_id', published.id, 'restores_release_id', candidate.id,
    'items', item_count, 'snapshot_sha256', created.snapshot_sha256));
  return created;
end;
$$;

-- The frozen snapshot exactly as hashed, for the release build to download and verify.
create function public.release_snapshot_text(p_release_id bigint)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found_snapshot jsonb;
begin
  perform private.require_admin();
  select r.snapshot into found_snapshot from public.releases r where r.id = p_release_id;
  if found_snapshot is null then
    raise exception 'Release % not found', p_release_id;
  end if;
  return found_snapshot::text;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Privileges: helpers stay private; the RPCs are for an authenticated
--    admin only (each also checks private.is_admin()).
-- ---------------------------------------------------------------------

revoke execute on function
  private.audit_release_change(),
  private.metric_projection(jsonb),
  private.snapshot_document_key(public.document_type),
  private.snapshot_documents(jsonb),
  private.compose_release_snapshot(jsonb, text),
  private.snapshot_content(jsonb),
  private.snapshot_sha256(jsonb),
  private.jsonb_diff_paths(jsonb, jsonb, text),
  private.snapshot_changes(jsonb, jsonb),
  private.document_metric_keys(jsonb),
  private.document_token_multiset(jsonb),
  private.current_document_revisions(),
  private.require_admin(),
  private.published_release(),
  private.lock_release(bigint, timestamptz),
  private.require_current_base(public.releases),
  private.record_release_items(public.releases, jsonb)
from public, anon, authenticated;

revoke execute on function
  public.preview_release_changes(),
  public.create_release(text),
  public.validate_release(bigint, timestamptz, jsonb),
  public.approve_release(bigint, timestamptz, text),
  public.start_release_publish(bigint, timestamptz),
  public.record_release_build(bigint, timestamptz, text),
  public.mark_release_published(bigint, timestamptz, boolean),
  public.record_release_failure(bigint, timestamptz, text, text),
  public.cancel_release(bigint, timestamptz, text),
  public.create_rollback_release(text),
  public.release_snapshot_text(bigint)
from public, anon;

grant execute on function
  public.preview_release_changes(),
  public.create_release(text),
  public.validate_release(bigint, timestamptz, jsonb),
  public.approve_release(bigint, timestamptz, text),
  public.start_release_publish(bigint, timestamptz),
  public.record_release_build(bigint, timestamptz, text),
  public.mark_release_published(bigint, timestamptz, boolean),
  public.record_release_failure(bigint, timestamptz, text, text),
  public.cancel_release(bigint, timestamptz, text),
  public.create_rollback_release(text),
  public.release_snapshot_text(bigint)
to authenticated;
