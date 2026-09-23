-- =====================================================================
-- Portfolio admin · Phase 5B · safe metric draft editing
--
-- Additive. Metric edits keep their existing path: an admin-only update of
-- public.metrics under RLS, applied only while updated_at still matches
-- (optimistic concurrency), versioned and audited by the existing triggers.
-- This migration adds the rules that path was missing:
--
--   1. The structural type of a metric is fixed, like its key: kind, value
--      type, unit, currency and display format decide what the number is and
--      how every page formats it. A different kind of number is a new metric.
--   2. Every admin edit needs a non-empty change summary (not only edits to
--      the figure), an edit that changes nothing is refused, and an archived
--      metric cannot be edited.
--
-- Nothing is published: the public site is built from the published
-- snapshot, never from this table. Existing guards, history, audit, archive,
-- evidence and verification rules are unchanged. The explicit functions
-- (set_metric_evidence_status, confirm_metric_verification, archive_metric)
-- run as a trusted role and are not affected by the new guard.
-- =====================================================================

-- 1. Structural fields are no longer writable by the admin.
revoke update (kind, value_type, unit, currency, display_format) on public.metrics from authenticated;

-- 2. Draft-save rules for admin edits. Runs before metrics_guard (trigger
--    order is alphabetical), so change_reason is still set when it is checked.
create function private.guard_metric_draft_save()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Imports and the explicit review/archive functions run as a trusted role.
  if private.is_trusted_role() then
    return new;
  end if;

  if old.archived_at is not null then
    raise exception 'Metric % is archived and cannot be edited', old.metric_key;
  end if;

  if (to_jsonb(new) - array['change_reason', 'updated_at', 'updated_by'])
     = (to_jsonb(old) - array['change_reason', 'updated_at', 'updated_by']) then
    raise exception 'There are no changes to save';
  end if;

  if new.change_reason is null or btrim(new.change_reason) = '' then
    raise exception 'A change summary is required for every metric edit';
  end if;

  return new;
end;
$$;

revoke execute on function private.guard_metric_draft_save() from public, anon, authenticated;

create trigger metrics_draft_guard
  before update on public.metrics
  for each row execute function private.guard_metric_draft_save();
