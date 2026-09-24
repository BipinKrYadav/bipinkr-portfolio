-- =====================================================================
-- Phase 5B — safe metric draft editing (migration 20260923000100)
--
-- One transaction, rolled back. Fixture users are example.test addresses.
-- Checks the new rules (change summary, no-op, archived, structural fields)
-- and that every existing protection still behaves exactly as before.
-- =====================================================================

begin;

create schema test_helpers;
grant usage on schema test_helpers to anon, authenticated;

create function test_helpers.act_as(p_user uuid, p_aal text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
  execute 'set local role authenticated';
end;
$$;

create function test_helpers.act_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end;
$$;

create function test_helpers.act_as_owner()
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  execute 'reset role';
end;
$$;

create function test_helpers.expect(p_ok boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FAIL: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$$;

create function test_helpers.expect_error(p_sql text, p_label text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'PASS: % (rejected: %)', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % — statement was allowed', p_label;
end;
$$;

-- The error message a statement raises, or null when it succeeds (its effects are undone).
create function test_helpers.error_of(p_sql text)
returns text language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return sqlerrm;
  end;
  return null;
end;
$$;

-- Rows a statement touches (an UPDATE … RETURNING 1 wrapped in a count).
create function test_helpers.rows_changed(p_update text)
returns integer language plpgsql as $$
declare
  v_count integer;
begin
  execute format('with changed as (%s) select count(*)::int from changed', p_update) into v_count;
  return v_count;
end;
$$;

grant execute on all functions in schema test_helpers to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'someone-else@example.test');
select private.grant_admin_owner('owner@example.test');

-- Fixtures, created as the owner.
insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, value, display_format,
  evidence_status, data_origin, source_type, reporting_period_note)
values
  ('dg.fixture.spend', 'Spend', 'Fixture spend.', 'raw', 'currency', 'inr', 'INR', 1000, 'inr', 'documented',
   'platform', 'platform_export', 'Not recorded.'),
  ('dg.fixture.leads', 'Leads', 'Fixture leads.', 'raw', 'count', 'lead', null, 10, 'integer', 'documented',
   'platform', 'platform_export', 'Not recorded.'),
  ('dg.fixture.spare', 'Spare', 'Fixture spare.', 'raw', 'count', 'lead', null, 3, 'integer', null,
   'platform', 'platform_export', 'Not recorded.'),
  ('dg.fixture.retired', 'Retired', 'Fixture retired.', 'raw', 'count', 'lead', null, 1, 'integer', null,
   'platform', 'platform_export', 'Not recorded.');
insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, formula, display_format,
  evidence_status, data_origin, source_type, reporting_period_note)
values
  ('dg.fixture.cpl', 'CPL', 'Fixture CPL.', 'calculated', 'currency', 'inr', 'INR',
   '{"fn":"ratio","numerator":"dg.fixture.spend","denominator":"dg.fixture.leads"}', 'inr', 'calculated',
   'derived', 'calculation', 'Not recorded.');
update public.metrics set archived_at = now() where metric_key = 'dg.fixture.retired';

-- A document field that references dg.fixture.leads.
insert into public.documents (doc_type, slug, schema_version, draft)
values ('homepage', 'dg-fixture-home', 1, '{"hero":"{{metric:dg.fixture.leads}}"}');
insert into public.document_metric_refs (document_id, field_path, metric_id)
select d.id, 'hero', m.id from public.documents d, public.metrics m
 where d.slug = 'dg-fixture-home' and m.metric_key = 'dg.fixture.leads';

-- ---------------------------------------------------------------------
-- 1. The MFA-verified admin: the new draft-save rules
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set description = 'Edited.' where metric_key = 'dg.fixture.spare'$$)
    like 'A change summary is required%',
  'an edit without a change summary is refused');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set description = 'Edited.', change_reason = '   ' where metric_key = 'dg.fixture.spare'$$)
    like 'A change summary is required%',
  'a blank change summary is refused');
select test_helpers.expect(
  (select description from public.metrics where metric_key = 'dg.fixture.spare') = 'Fixture spare.',
  'a refused edit leaves the metric unchanged');

update public.metrics set description = 'Edited in the draft-save test.', change_reason = 'Clarified the description'
 where metric_key = 'dg.fixture.spare';
select test_helpers.expect(
  (select description = 'Edited in the draft-save test.' and change_reason is null
          and updated_by = '00000000-0000-4000-8000-000000000001'
     from public.metrics where metric_key = 'dg.fixture.spare'),
  'an edit with a summary is saved, the summary is not kept on the row, and the editor is stamped');
select test_helpers.expect(
  (select v.change_kind = 'update' and v.reason = 'Clarified the description' and v.release_id is null
          and v.old_row ->> 'description' = 'Fixture spare.' and v.new_row ->> 'description' = 'Edited in the draft-save test.'
     from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'dg.fixture.spare' order by v.id desc limit 1),
  'the edit creates a new unreleased version with the summary and before/after rows');
select test_helpers.expect(
  (select count(*) from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'dg.fixture.spare') = 2,
  'the previous version is retained');
select test_helpers.expect(
  (select count(*) from public.audit_log where table_name = 'metrics' and action = 'metric.update'
      and detail ->> 'metric_key' = 'dg.fixture.spare' and detail ->> 'reason' = 'Clarified the description') = 1,
  'the edit is audited with its summary');

select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set description = 'Edited in the draft-save test.', change_reason = 'Nothing new'
                          where metric_key = 'dg.fixture.spare'$$) = 'There are no changes to save',
  'an edit that changes nothing is refused');
select test_helpers.expect(
  (select count(*) from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'dg.fixture.spare') = 2,
  'a refused no-op creates no version');

select test_helpers.expect(
  test_helpers.rows_changed($$update public.metrics set description = 'Stale edit.', change_reason = 'Stale'
                             where metric_key = 'dg.fixture.spare' and updated_at = '2000-01-01T00:00:00Z' returning 1$$) = 0,
  'an edit based on a stale updated_at changes no row (optimistic concurrency)');
select test_helpers.expect(
  (select description from public.metrics where metric_key = 'dg.fixture.spare') = 'Edited in the draft-save test.',
  'the stale edit left the saved draft in place');

-- ---------------------------------------------------------------------
-- 2. Structural fields and archived metrics
-- ---------------------------------------------------------------------

select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set kind = 'legacy_fixed', change_reason = 'x' where metric_key = 'dg.fixture.spare'$$)
    like 'permission denied%',
  'the kind cannot be changed by the admin');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set value_type = 'percent', change_reason = 'x' where metric_key = 'dg.fixture.spare'$$)
    like 'permission denied%',
  'the value type cannot be changed by the admin');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set unit = 'click', change_reason = 'x' where metric_key = 'dg.fixture.spare'$$)
    like 'permission denied%',
  'the unit cannot be changed by the admin');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set currency = null, change_reason = 'x' where metric_key = 'dg.fixture.spend'$$)
    like 'permission denied%',
  'the currency cannot be changed by the admin');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set display_format = 'inr_lakh', change_reason = 'x' where metric_key = 'dg.fixture.spend'$$)
    like 'permission denied%',
  'the display format cannot be changed by the admin');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set metric_key = 'dg.fixture.renamed', change_reason = 'x' where metric_key = 'dg.fixture.spare'$$)
    like 'permission denied%',
  'the metric key still cannot be changed');

select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set description = 'Revived.', change_reason = 'x' where metric_key = 'dg.fixture.retired'$$)
    like 'Metric dg.fixture.retired is archived and cannot be edited',
  'an archived metric cannot be edited');

-- ---------------------------------------------------------------------
-- 3. Existing protections are unchanged
-- ---------------------------------------------------------------------

select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set value = 1200 where metric_key = 'dg.fixture.spend'$$)
    like 'A change summary is required%',
  'a value change without a summary is still refused');
update public.metrics set value = 1200, change_reason = 'Second export' where metric_key = 'dg.fixture.spend';
select test_helpers.expect(
  (select v.reason = 'Second export' and (v.new_row ->> 'value')::numeric = 1200
     from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'dg.fixture.spend' order by v.id desc limit 1),
  'a value change with a summary is versioned with its summary');
select test_helpers.expect(
  test_helpers.error_of($$update public.metrics set evidence_status = 'verified', change_reason = 'x' where metric_key = 'dg.fixture.spend'$$)
    like 'permission denied%',
  'the evidence status still cannot be written directly');

select public.set_metric_evidence_status((select id from public.metrics where metric_key = 'dg.fixture.spend'), 'verified', 'Checked the export');
select test_helpers.expect(
  (select evidence_status::text from public.metrics where metric_key = 'dg.fixture.spend') = 'verified',
  'set_metric_evidence_status still works (it is not subject to the draft-save guard)');
select public.confirm_metric_verification((select id from public.metrics where metric_key = 'dg.fixture.spend'), 'Export › Amount spent');
select test_helpers.expect(
  (select verified_value = 1200 and verification_source = 'admin_confirmation' from public.metrics where metric_key = 'dg.fixture.spend'),
  'confirm_metric_verification still works');

select test_helpers.expect(
  test_helpers.error_of($$select public.archive_metric((select id from public.metrics where metric_key = 'dg.fixture.leads'), 'x')$$)
    like '%input to other metrics%',
  'a formula input still cannot be archived');
select test_helpers.expect(
  (select count(*) from public.document_metric_refs r join public.metrics m on m.id = r.metric_id
    where m.metric_key = 'dg.fixture.leads') = 1,
  'the document reference is intact');
update public.metrics set name = 'Leads (edited)', change_reason = 'Renamed the label' where metric_key = 'dg.fixture.leads';
select test_helpers.expect(
  (select count(*) from public.document_metric_refs r join public.metrics m on m.id = r.metric_id
    where m.metric_key = 'dg.fixture.leads') = 1,
  'editing a referenced metric keeps its document reference');

select public.archive_metric((select id from public.metrics where metric_key = 'dg.fixture.spare'), 'Retired in test');
select test_helpers.expect(
  (select archived_at is not null from public.metrics where metric_key = 'dg.fixture.spare'),
  'archive_metric still archives an unreferenced metric');

-- ---------------------------------------------------------------------
-- 4. Access control
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal1');
select test_helpers.expect(
  test_helpers.rows_changed($$update public.metrics set description = 'aal1', change_reason = 'x'
                             where metric_key = 'dg.fixture.cpl' returning 1$$) = 0,
  'the admin without MFA changes no metric');

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect(
  test_helpers.rows_changed($$update public.metrics set description = 'outsider', change_reason = 'x'
                             where metric_key = 'dg.fixture.cpl' returning 1$$) = 0,
  'a signed-in non-admin changes no metric');

select test_helpers.act_as_anon();
select test_helpers.expect_error(
  $$update public.metrics set description = 'anon', change_reason = 'x' where metric_key = 'dg.fixture.cpl'$$,
  'an anonymous caller cannot update metrics');

select test_helpers.act_as_owner();
select test_helpers.expect(
  (select description from public.metrics where metric_key = 'dg.fixture.cpl') = 'Fixture CPL.',
  'none of the refused callers changed the metric');

select 'ALL ADMIN FOUNDATION TESTS PASSED' as result;

rollback;
