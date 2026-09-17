-- =====================================================================
-- Admin backend foundation · 3 of 7 · canonical metrics
--
-- Mirrors the Phase 2 metric model (lib/metrics/types.ts) plus the private
-- and verification fields the admin panel needs. The human-verification rule
-- is enforced here, not only in the UI:
--
--   * evidence_status and the verified_* columns cannot be written by API
--     roles directly — only through set_metric_evidence_status() and
--     confirm_metric_verification(), which require an admin and a reason/note;
--   * changing a value never touches evidence_status or verified_*, so a
--     changed-since-verification state is always detectable;
--   * formulas are limited to the fixed list and cannot reference missing
--     metrics or form cycles.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Formula validation (fixed list — no expression language)
-- ---------------------------------------------------------------------

create function private.is_metric_key(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'string'
     and (p_value #>> '{}') ~ '^[a-z0-9_]+(\.[a-z0-9_]+){1,5}$';
$$;

create function private.is_metric_key_list(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_value) = 'array'
     and jsonb_array_length(p_value) > 0
     and not exists (
       select 1 from jsonb_array_elements(p_value) as element(value)
       where not private.is_metric_key(element.value)
     );
$$;

create function private.is_valid_formula(p_formula jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_formula) <> 'object' then false
    when p_formula ->> 'fn' = 'ratio' then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['denominator', 'fn', 'numerator']
      and private.is_metric_key(p_formula -> 'numerator') and private.is_metric_key(p_formula -> 'denominator')
    when p_formula ->> 'fn' = 'percent' then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['fn', 'part', 'whole']
      and private.is_metric_key(p_formula -> 'part') and private.is_metric_key(p_formula -> 'whole')
    when p_formula ->> 'fn' = 'sum' then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['fn', 'terms']
      and private.is_metric_key_list(p_formula -> 'terms')
    when p_formula ->> 'fn' = 'difference' then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['fn', 'minuend', 'subtrahend']
      and private.is_metric_key(p_formula -> 'minuend') and private.is_metric_key(p_formula -> 'subtrahend')
    when p_formula ->> 'fn' in ('pct_decrease', 'pct_increase') then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['fn', 'from', 'to']
      and private.is_metric_key(p_formula -> 'from') and private.is_metric_key(p_formula -> 'to')
    when p_formula ->> 'fn' = 'multiple' then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['base', 'fn', 'value']
      and private.is_metric_key(p_formula -> 'value') and private.is_metric_key(p_formula -> 'base')
    when p_formula ->> 'fn' in ('min', 'max', 'spread', 'count') then
      (select array_agg(k order by k) from jsonb_object_keys(p_formula) k) = array['fn', 'of']
      and private.is_metric_key_list(p_formula -> 'of')
    else false
  end;
$$;

-- Every metric key a (valid) formula reads.
create function private.formula_input_keys(p_formula jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(key), '{}')
  from (
    select value #>> '{}' as key
    from jsonb_each(coalesce(p_formula, '{}'::jsonb)) as pair(name, value)
    where pair.name <> 'fn' and jsonb_typeof(value) = 'string'
    union all
    select element #>> '{}'
    from jsonb_each(coalesce(p_formula, '{}'::jsonb)) as pair(name, value),
         jsonb_array_elements(case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end) as element
  ) inputs;
$$;

-- ---------------------------------------------------------------------
-- Metrics
-- ---------------------------------------------------------------------

create table public.metrics (
  id                     uuid primary key default gen_random_uuid(),
  metric_key             text not null unique check (metric_key ~ '^[a-z0-9_]+(\.[a-z0-9_]+){1,5}$'),
  name                   text not null check (btrim(name) <> ''),
  description            text not null check (btrim(description) <> ''),
  kind                   public.metric_kind not null,
  value_type             public.metric_value_type not null,
  unit                   public.metric_unit not null,
  currency               text check (currency = 'INR'),
  value                  numeric check (value is null or (value < 'Infinity'::numeric and value > '-Infinity'::numeric)),
  precision              public.value_precision not null default 'exact',
  display_format         public.metric_display_format not null,
  formula                jsonb check (formula is null or private.is_valid_formula(formula)),
  -- Human-set grade; null = not graded. Written only via set_metric_evidence_status().
  evidence_status        public.evidence_status,
  data_origin            public.data_origin not null,
  source_platform        public.source_platform,
  source_type            public.source_type not null,
  -- Private: never exported to a snapshot.
  source_reference       text,
  attribution_setting    text,
  reporting_period_basis public.reporting_period_basis not null default 'not_recorded',
  reporting_period_start date,
  reporting_period_end   date,
  reporting_period_note  text not null check (btrim(reporting_period_note) <> ''),
  public_note            text,
  -- Private: never exported to a snapshot.
  internal_note          text,
  legacy_method_note     text,
  -- Verification record. Written only via confirm_metric_verification() (or a legacy import).
  verified_by            uuid references auth.users (id) on delete set null,
  verified_at            timestamptz,
  verified_value         numeric,
  verified_status        public.evidence_status,
  verification_source    public.verification_source,
  -- Write-only input: why this update changes the value, kind, formula or precision.
  -- Required on those updates, moved into metric_versions.reason, never kept on the row.
  change_reason          text check (change_reason is null),
  created_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id) on delete set null,
  updated_at             timestamptz not null default now(),
  updated_by             uuid references auth.users (id) on delete set null,
  archived_at            timestamptz,
  archived_by            uuid references auth.users (id) on delete set null,

  constraint metrics_currency_matches_type check ((value_type = 'currency') = (currency is not null)),
  constraint metrics_raw_shape check (
    kind <> 'raw' or (formula is null and legacy_method_note is null)
  ),
  constraint metrics_calculated_shape check (
    kind <> 'calculated'
    or (value is null and formula is not null and legacy_method_note is null
        and data_origin = 'derived' and source_type = 'calculation')
  ),
  constraint metrics_legacy_shape check (
    kind <> 'legacy_fixed'
    or (value is not null and formula is null and legacy_method_note is not null and btrim(legacy_method_note) <> '')
  ),
  constraint metrics_period_order check (
    reporting_period_start is null or reporting_period_end is null or reporting_period_start <= reporting_period_end
  ),
  constraint metrics_verification_complete check (
    (verification_source is null and verified_at is null and verified_by is null)
    or verification_source = 'legacy_import'
    or (verification_source = 'admin_confirmation' and verified_at is not null and verified_by is not null)
  )
);

comment on table public.metrics is
  'Canonical evidence-backed figures. Public projection feeds snapshots; source_reference, attribution_setting, internal_note and verified_* stay private.';

create index metrics_kind_idx on public.metrics (kind);
create index metrics_evidence_status_idx on public.metrics (evidence_status);
create index metrics_active_idx on public.metrics (metric_key) where archived_at is null;

-- ---------------------------------------------------------------------
-- Integrity and verification guard
-- ---------------------------------------------------------------------

create function private.guard_metric_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_inputs text[];
  v_missing text[];
  v_cycle boolean;
begin
  if tg_op = 'UPDATE' and new.metric_key is distinct from old.metric_key then
    raise exception 'metric_key cannot change (% → %); create a new metric instead', old.metric_key, new.metric_key;
  end if;

  -- Human-controlled fields: only trusted roles (i.e. the explicit functions below, or an import).
  if not private.is_trusted_role() then
    if tg_op = 'INSERT' and (
      new.verified_by is not null or new.verified_at is not null or new.verified_value is not null
      or new.verified_status is not null or new.verification_source is not null
    ) then
      raise exception 'Verification can only be recorded with confirm_metric_verification()';
    end if;

    if tg_op = 'UPDATE' and (
      new.evidence_status is distinct from old.evidence_status
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
      or new.verified_value is distinct from old.verified_value
      or new.verified_status is distinct from old.verified_status
      or new.verification_source is distinct from old.verification_source
    ) then
      raise exception 'Evidence status and verification can only change through set_metric_evidence_status() and confirm_metric_verification()';
    end if;
  end if;

  -- A reason is required, in the same statement, whenever the figure itself changes.
  if tg_op = 'UPDATE' and (
    new.value is distinct from old.value
    or new.kind is distinct from old.kind
    or new.formula is distinct from old.formula
    or new.precision is distinct from old.precision
  ) and (new.change_reason is null or btrim(new.change_reason) = '') then
    raise exception 'Changing the value, kind, formula or precision of % requires change_reason', new.metric_key;
  end if;

  -- Hand the reason to the version trigger and keep the column empty.
  if new.change_reason is not null then
    perform set_config('app.metric_change_reason', new.change_reason, true);
    new.change_reason := null;
  end if;

  -- Formula inputs must exist, be active, not be the metric itself, and not form a cycle.
  if new.formula is not null and (tg_op = 'INSERT' or new.formula is distinct from old.formula) then
    if not private.is_valid_formula(new.formula) then
      raise exception 'Formula of % is not a supported calculation: %', new.metric_key, new.formula;
    end if;
    v_inputs := private.formula_input_keys(new.formula);

    if new.metric_key = any (v_inputs) then
      raise exception 'Formula of % reads itself', new.metric_key;
    end if;

    select array_agg(input) into v_missing
    from unnest(v_inputs) as input
    where not exists (
      select 1 from public.metrics m where m.metric_key = input and m.archived_at is null
    );
    if v_missing is not null then
      raise exception 'Formula of % reads metrics that do not exist or are archived: %', new.metric_key, v_missing;
    end if;

    with recursive reachable(key) as (
      select unnest(v_inputs)
      union
      select unnest(private.formula_input_keys(m.formula))
      from public.metrics m
      join reachable r on m.metric_key = r.key
      where m.formula is not null and m.metric_key <> new.metric_key
    )
    select exists (select 1 from reachable where key = new.metric_key) into v_cycle;

    if v_cycle then
      raise exception 'Formula of % would create a circular dependency', new.metric_key;
    end if;
  end if;

  -- A metric that other metrics still read cannot be archived.
  if tg_op = 'UPDATE' and new.archived_at is not null and old.archived_at is null then
    if exists (
      select 1 from public.metrics m
      where m.archived_at is null and m.id <> new.id
        and new.metric_key = any (private.formula_input_keys(m.formula))
    ) then
      raise exception 'Metric % is an input to other metrics and cannot be archived', new.metric_key;
    end if;
    new.archived_by := coalesce((select auth.uid()), new.archived_by);
  end if;

  return new;
end;
$$;

create trigger metrics_guard
  before insert or update on public.metrics
  for each row execute function private.guard_metric_change();

create trigger metrics_stamp
  before insert or update on public.metrics
  for each row execute function private.stamp_actor();

-- Metrics are archived, never deleted, once anything depends on them (FKs restrict).

-- ---------------------------------------------------------------------
-- Version history (append-only)
-- ---------------------------------------------------------------------

create table public.metric_versions (
  id          bigint generated always as identity primary key,
  metric_id   uuid not null references public.metrics (id) on delete restrict,
  change_kind text not null check (change_kind in (
    'insert', 'update', 'evidence_status_changed', 'verification_confirmed', 'archived'
  )),
  reason      text,
  old_row     jsonb,
  new_row     jsonb not null,
  release_id  bigint references public.releases (id) on delete restrict,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references auth.users (id) on delete set null
);

create index metric_versions_metric_idx on public.metric_versions (metric_id, changed_at desc);
create index metric_versions_release_idx on public.metric_versions (release_id);

create function private.record_metric_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_reason text;
begin
  if tg_op = 'INSERT' then
    v_kind := 'insert';
  elsif new.archived_at is not null and old.archived_at is null then
    v_kind := 'archived';
  elsif new.verified_at is distinct from old.verified_at or new.verified_value is distinct from old.verified_value then
    v_kind := 'verification_confirmed';
  elsif new.evidence_status is distinct from old.evidence_status then
    v_kind := 'evidence_status_changed';
  else
    v_kind := 'update';
  end if;

  v_reason := coalesce(
    nullif(current_setting('app.metric_change_note', true), ''),
    nullif(current_setting('app.metric_change_reason', true), '')
  );
  perform set_config('app.metric_change_reason', '', true);

  insert into public.metric_versions (metric_id, change_kind, reason, old_row, new_row, changed_by)
  values (
    new.id,
    v_kind,
    v_reason,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    (select auth.uid())
  );

  perform private.write_audit(
    'metric.' || v_kind,
    'metrics',
    new.id::text,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    jsonb_build_object('metric_key', new.metric_key, 'reason', v_reason)
  );
  return null;
end;
$$;

create trigger metrics_version
  after insert or update on public.metrics
  for each row execute function private.record_metric_version();

-- History rows are immutable, except that a publish may link an unlinked row to its release.
create function private.guard_history_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'release_id') = (to_jsonb(old) - 'release_id')
     and old.release_id is null
     and new.release_id is not null
     and private.is_trusted_role() then
    return new;
  end if;
  raise exception '% on %.% is not allowed: history rows are append-only', tg_op, tg_table_schema, tg_table_name;
end;
$$;

create trigger metric_versions_append_only
  before update or delete on public.metric_versions
  for each row execute function private.guard_history_row();

create trigger metric_versions_no_truncate
  before truncate on public.metric_versions
  for each statement execute function private.prevent_mutation();

-- ---------------------------------------------------------------------
-- Explicit, human-controlled actions
-- ---------------------------------------------------------------------

-- The ONLY way an API user changes a metric's evidence status. Requires an admin and a reason.
create function public.set_metric_evidence_status(
  p_metric_id uuid,
  p_status public.evidence_status,
  p_reason text
)
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
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to change an evidence status';
  end if;

  perform set_config('app.metric_change_note', p_reason, true);

  update public.metrics
     set evidence_status = p_status
   where id = p_metric_id and archived_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Metric % not found or archived', p_metric_id;
  end if;

  perform set_config('app.metric_change_note', '', true);
  return v_row;
end;
$$;

-- Records that the admin checked the current value against its source.
-- Captures value and status at that moment; later edits leave this record
-- untouched, so "changed since last source check" is always visible.
create function public.confirm_metric_verification(p_metric_id uuid, p_note text)
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
  if p_note is null or btrim(p_note) = '' then
    raise exception 'A note describing the source check is required';
  end if;

  perform set_config('app.metric_change_note', p_note, true);

  update public.metrics
     set verified_by = (select auth.uid()),
         verified_at = now(),
         verified_value = value,
         verified_status = evidence_status,
         verification_source = 'admin_confirmation'
   where id = p_metric_id and archived_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Metric % not found or archived', p_metric_id;
  end if;

  perform set_config('app.metric_change_note', '', true);
  return v_row;
end;
$$;

revoke execute on function public.set_metric_evidence_status(uuid, public.evidence_status, text) from public, anon;
revoke execute on function public.confirm_metric_verification(uuid, text) from public, anon;
grant execute on function public.set_metric_evidence_status(uuid, public.evidence_status, text) to authenticated;
grant execute on function public.confirm_metric_verification(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Claims-ledger blocked phrases (docs/claims-ledger.md §1)
-- ---------------------------------------------------------------------

create table public.blocked_phrases (
  id         uuid primary key default gen_random_uuid(),
  phrase     text not null check (btrim(phrase) <> ''),
  reason     text not null check (btrim(reason) <> ''),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create unique index blocked_phrases_phrase_key on public.blocked_phrases (lower(phrase));

create trigger blocked_phrases_stamp
  before insert or update on public.blocked_phrases
  for each row execute function private.stamp_actor();

create trigger blocked_phrases_audit
  after insert or update or delete on public.blocked_phrases
  for each row execute function private.audit_row_change();
