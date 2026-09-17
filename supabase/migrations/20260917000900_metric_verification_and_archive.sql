-- =====================================================================
-- Admin backend · 9 · dependency-aware verification, database archive time
--
-- 1. public.metric_verification: the authoritative verification state of
--    every metric. A calculated metric's source check goes stale when any
--    metric it reads — directly or through other formulas — has its figure
--    (value, kind, formula or precision) changed after the check.
-- 2. Archiving goes through public.archive_metric(), which stamps database
--    time. API roles can no longer write archived_at, a trigger forces
--    database time on every archive, and unarchiving stays unsupported.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Verification state
-- ---------------------------------------------------------------------

-- security_invoker: rows are read with the caller's own privileges and RLS,
-- so only an MFA-verified admin can see anything.
create view public.metric_verification
with (security_invoker = true)
as
with recursive
  -- When each metric's figure last changed, from its append-only history.
  figure_changes as (
    select v.metric_id, max(v.changed_at) as changed_at
    from public.metric_versions v
    where v.change_kind = 'insert'
       or (v.old_row -> 'value') is distinct from (v.new_row -> 'value')
       or (v.old_row -> 'kind') is distinct from (v.new_row -> 'kind')
       or (v.old_row -> 'formula') is distinct from (v.new_row -> 'formula')
       or (v.old_row -> 'precision') is distinct from (v.new_row -> 'precision')
    group by v.metric_id
  ),
  -- Every metric paired with itself and everything its formula reads, recursively.
  -- UNION (not UNION ALL) de-duplicates, so the walk ends even on bad data.
  dependencies (root_id, metric_id) as (
    select m.id, m.id from public.metrics m
    union
    select d.root_id, input.id
    from dependencies d
    join public.metrics parent on parent.id = d.metric_id and parent.kind = 'calculated'
    join public.metrics input on input.metric_key = any (private.formula_input_keys(parent.formula))
  )
select
  m.id as metric_id,
  m.metric_key,
  case
    when m.verified_at is null then 'not_verified'
    when m.value is distinct from m.verified_value
      or m.evidence_status is distinct from m.verified_status
      or basis.changed_at > m.verified_at then 'changed_since_verification'
    else 'verified_current'
  end as verification_state,
  own.changed_at as figure_changed_at,
  basis.changed_at as basis_changed_at,
  coalesce(stale.keys, '{}') as stale_inputs
from public.metrics m
left join figure_changes own on own.metric_id = m.id
left join lateral (
  select max(fc.changed_at) as changed_at
  from dependencies d
  join figure_changes fc on fc.metric_id = d.metric_id
  where d.root_id = m.id
) basis on true
left join lateral (
  select array_agg(input.metric_key order by input.metric_key) as keys
  from dependencies d
  join public.metrics input on input.id = d.metric_id
  join figure_changes fc on fc.metric_id = d.metric_id
  where d.root_id = m.id and d.metric_id <> m.id and m.verified_at is not null and fc.changed_at > m.verified_at
) stale on true;

comment on view public.metric_verification is
  'Verification state per metric: not_verified, verified_current, or changed_since_verification when the metric or any formula input (recursively) changed after the last source check.';

revoke all on public.metric_verification from anon, authenticated;
grant select on public.metric_verification to authenticated;

-- ---------------------------------------------------------------------
-- 2. Archive timestamp
-- ---------------------------------------------------------------------

-- The browser can no longer set archived_at at all.
revoke update (archived_at) on public.metrics from authenticated;

-- Every archive uses database time, whoever runs it; archived metrics stay archived.
create function private.control_metric_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.archived_at is not null and new.archived_at is distinct from old.archived_at then
    raise exception 'Metric % is archived; unarchiving or changing the archive time is not supported', old.metric_key;
  end if;
  if old.archived_at is null and new.archived_at is not null then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

-- Named to run before metrics_guard, so the guards see the database time.
create trigger metrics_archive_time
  before update of archived_at on public.metrics
  for each row execute function private.control_metric_archive();

-- The only way an API user archives a metric. The reference guards still apply.
create function public.archive_metric(p_metric_id uuid, p_reason text default null)
returns public.metrics
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.metrics;
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if exists (select 1 from public.metrics m where m.id = p_metric_id and m.archived_at is not null) then
    raise exception 'Metric % is already archived', p_metric_id;
  end if;

  perform set_config('app.metric_change_note', coalesce(nullif(btrim(p_reason), ''), ''), true);

  update public.metrics
     set archived_at = now()
   where id = p_metric_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Metric % not found', p_metric_id;
  end if;

  perform set_config('app.metric_change_note', '', true);
  return v_row;
end;
$$;

revoke execute on function public.archive_metric(uuid, text) from public, anon;
grant execute on function public.archive_metric(uuid, text) to authenticated;
revoke execute on function private.control_metric_archive() from public, anon, authenticated;
