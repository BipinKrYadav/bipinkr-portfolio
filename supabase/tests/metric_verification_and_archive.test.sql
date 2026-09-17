-- =====================================================================
-- Migration 9 — verification view security and database archive time
--
-- One transaction, rolled back. Fixture users are example.test addresses.
-- Staleness over time needs separate transactions (now() is fixed inside
-- one), so dependency invalidation is tested in admin/tests instead.
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

grant execute on all functions in schema test_helpers to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'someone-else@example.test');
select private.grant_admin_owner('owner@example.test');

insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
  data_origin, source_type, reporting_period_note)
values ('mv.fixture.spend', 'n', 'd', 'raw', 'count', 'lead', 10, 'integer', 'platform', 'platform_export', 'n'),
       ('mv.fixture.leads', 'n', 'd', 'raw', 'count', 'lead', 2, 'integer', 'platform', 'platform_export', 'n'),
       ('mv.fixture.spare', 'n', 'd', 'raw', 'count', 'lead', 1, 'integer', 'platform', 'platform_export', 'n');
insert into public.metrics (metric_key, name, description, kind, value_type, unit, formula, display_format,
  data_origin, source_type, reporting_period_note)
values ('mv.fixture.cpl', 'n', 'd', 'calculated', 'count', 'lead',
        '{"fn":"ratio","numerator":"mv.fixture.spend","denominator":"mv.fixture.leads"}', 'integer', 'derived', 'calculation', 'n');

-- ---------------------------------------------------------------------
-- Verification view: admin only, computed by the database
-- ---------------------------------------------------------------------

select test_helpers.expect(
  (select 'security_invoker=true' = any (c.reloptions) from pg_class c where c.oid = 'public.metric_verification'::regclass),
  'the verification view runs with the caller''s privileges (security_invoker)');

select test_helpers.act_as_anon();
select test_helpers.expect_error('select * from public.metric_verification', 'anon cannot read verification state');
select test_helpers.act_as_owner();

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect(
  (select count(*) from public.metric_verification) = 0, 'a signed-in non-admin sees no verification state');
select test_helpers.act_as_owner();

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal1');
select test_helpers.expect(
  (select count(*) from public.metric_verification) = 0, 'the admin without MFA sees no verification state');
select test_helpers.act_as_owner();

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select test_helpers.expect(
  (select count(*) from public.metric_verification where verification_state = 'not_verified') = 4,
  'the admin sees every metric as not verified before any source check');
select test_helpers.expect(
  (select stale_inputs = '{}' from public.metric_verification where metric_key = 'mv.fixture.cpl'),
  'no stale inputs are reported without a source check');
select test_helpers.expect_error(
  $$update public.metric_verification set verification_state = 'verified_current'$$,
  'verification state cannot be written');

-- ---------------------------------------------------------------------
-- Archive time comes from the database
-- ---------------------------------------------------------------------

select test_helpers.expect_error(
  $$update public.metrics set archived_at = '2000-01-01T00:00:00Z' where metric_key = 'mv.fixture.spare'$$,
  'the browser cannot write archived_at directly');

select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'mv.fixture.spend'))$$,
  'archive_metric still refuses a metric that a formula reads');

select public.archive_metric((select id from public.metrics where metric_key = 'mv.fixture.spare'), 'Withdrawn');
select test_helpers.expect(
  (select archived_at = now() and archived_by = '00000000-0000-4000-8000-000000000001'
     from public.metrics where metric_key = 'mv.fixture.spare'),
  'archive_metric records database time and the admin');
select test_helpers.expect(
  (select v.change_kind = 'archived' and v.reason = 'Withdrawn'
     from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'mv.fixture.spare' order by v.id desc limit 1),
  'the archive reason is recorded in the version history');
select test_helpers.expect(
  exists (select 1 from public.audit_log a join public.metrics m on a.record_id = m.id::text
           where m.metric_key = 'mv.fixture.spare' and a.action = 'metric.archived'
             and a.actor_id = '00000000-0000-4000-8000-000000000001'),
  'the archive is written to the audit log');
select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'mv.fixture.spare'))$$,
  'an archived metric cannot be archived again');
select test_helpers.expect_error(
  $$delete from public.metrics where metric_key = 'mv.fixture.spare'$$,
  'archived metrics are not deleted');
select test_helpers.act_as_owner();

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'mv.fixture.leads'))$$,
  'a non-admin cannot archive');
select test_helpers.act_as_owner();

select test_helpers.act_as_anon();
select test_helpers.expect_error(
  $$select public.archive_metric('00000000-0000-4000-8000-000000000099')$$, 'anon cannot archive');
select test_helpers.act_as_owner();

-- Even the owner role cannot backdate an archive or unarchive.
insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
  data_origin, source_type, reporting_period_note)
values ('mv.fixture.owner_archived', 'n', 'd', 'raw', 'count', 'lead', 1, 'integer', 'platform', 'platform_export', 'n');
update public.metrics set archived_at = '2000-01-01T00:00:00Z' where metric_key = 'mv.fixture.owner_archived';
select test_helpers.expect(
  (select archived_at = now() from public.metrics where metric_key = 'mv.fixture.owner_archived'),
  'a supplied archive timestamp is replaced by database time, for every role');
select test_helpers.expect_error(
  $$update public.metrics set archived_at = null where metric_key = 'mv.fixture.owner_archived'$$,
  'unarchiving is not supported');
select test_helpers.expect_error(
  $$update public.metrics set archived_at = '2001-01-01T00:00:00Z' where metric_key = 'mv.fixture.owner_archived'$$,
  'an archive time cannot be changed');

select 'ALL ADMIN FOUNDATION TESTS PASSED' as result;

rollback;
