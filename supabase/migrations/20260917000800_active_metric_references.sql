-- =====================================================================
-- Admin backend · 8 · archived metrics cannot gain new references
--
-- Migrations 3–4 already stop a referenced metric from being archived, and
-- stop a formula from reading an archived metric. This closes the same gap
-- for the other two reference types: page content (document_metric_refs)
-- and linked phrases may only point at active metrics.
-- =====================================================================

create function private.guard_document_metric_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_key text;
begin
  select m.metric_key into v_key
  from public.metrics m
  where m.id = new.metric_id and m.archived_at is not null;

  if v_key is not null then
    raise exception 'Metric % is archived and cannot be referenced by page content', v_key;
  end if;
  return new;
end;
$$;

create trigger document_metric_refs_active_metric
  before insert or update on public.document_metric_refs
  for each row execute function private.guard_document_metric_ref();

-- Same checks as migration 4, plus: keys added or changed must name active metrics.
create or replace function private.guard_linked_phrase()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_missing text[];
  v_archived text[];
begin
  select array_agg(k) into v_missing
  from unnest(new.metric_keys) k
  where not exists (select 1 from public.metrics m where m.metric_key = k);

  if v_missing is not null then
    raise exception 'Linked phrase references metrics that do not exist: %', v_missing;
  end if;

  if tg_op = 'INSERT' or new.metric_keys is distinct from old.metric_keys then
    select array_agg(k) into v_archived
    from unnest(new.metric_keys) k
    where exists (select 1 from public.metrics m where m.metric_key = k and m.archived_at is not null);

    if v_archived is not null then
      raise exception 'Linked phrase references archived metrics: %', v_archived;
    end if;
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

revoke execute on function private.guard_document_metric_ref() from public, anon, authenticated;
revoke execute on function private.guard_linked_phrase() from public, anon, authenticated;
