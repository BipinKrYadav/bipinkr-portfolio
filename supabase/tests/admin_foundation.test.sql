-- =====================================================================
-- Admin backend foundation — security and integrity tests
--
-- Runs in ONE transaction and rolls back: nothing is left behind.
-- Requires the migrations in supabase/migrations and the Supabase `auth`
-- and `storage` schemas (a local `supabase start` database, or the offline
-- harness described in docs/admin-backend.md).
--
-- Users below are fixtures with example.test addresses — not real accounts.
-- Any failed expectation raises an exception and aborts the run.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Helpers (created inside the transaction, rolled back at the end)
-- ---------------------------------------------------------------------

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

-- Back to the migration owner with no session claims (as in the SQL editor).
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

create function test_helpers.count_rows(p_sql text)
returns bigint language plpgsql as $$
declare v bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into v;
  return v;
end;
$$;

grant execute on all functions in schema test_helpers to anon, authenticated;

-- ---------------------------------------------------------------------
-- Fixtures (as the migration owner)
-- ---------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'someone-else@example.test');

select private.grant_admin_owner('owner@example.test');

insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, value,
  display_format, evidence_status, data_origin, source_platform, source_type, source_reference, reporting_period_note)
values
  ('test.fixture.spend', 'Fixture spend', 'Fixture spend.', 'raw', 'currency', 'inr', 'INR', 100,
   'inr', 'documented', 'platform', 'meta_ads', 'platform_export', 'private reference', 'Not recorded.'),
  ('test.fixture.leads', 'Fixture leads', 'Fixture leads.', 'raw', 'count', 'lead', null, 4,
   'integer', 'verified', 'platform', 'meta_ads', 'platform_export', null, 'Not recorded.');

insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, formula,
  display_format, evidence_status, data_origin, source_platform, source_type, reporting_period_note)
values
  ('test.fixture.cpl', 'Fixture CPL', 'Spend ÷ leads.', 'calculated', 'currency', 'inr', 'INR',
   '{"fn":"ratio","numerator":"test.fixture.spend","denominator":"test.fixture.leads"}',
   'inr', 'calculated', 'derived', 'meta_ads', 'calculation', 'Not recorded.');

-- ---------------------------------------------------------------------
-- 1. Structure: RLS everywhere, nothing granted to anon
-- ---------------------------------------------------------------------

select test_helpers.expect(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname in (
      'admin_users', 'audit_log', 'metrics', 'metric_versions', 'metric_evidence', 'linked_phrases',
      'blocked_phrases', 'documents', 'document_revisions', 'document_metric_refs', 'redirects',
      'media_assets', 'media_usages', 'evidence_files', 'releases', 'release_items', 'service_tokens')
    and c.relrowsecurity) = 17,
  'all 17 admin tables have row level security enabled');

select test_helpers.expect(
  not exists (select 1 from information_schema.role_table_grants
              where grantee = 'anon' and table_schema = 'public' and table_name in (
      'admin_users', 'audit_log', 'metrics', 'metric_versions', 'metric_evidence', 'linked_phrases',
      'blocked_phrases', 'documents', 'document_revisions', 'document_metric_refs', 'redirects',
      'media_assets', 'media_usages', 'evidence_files', 'releases', 'release_items', 'service_tokens')),
  'anon has no table privileges on admin tables');

select test_helpers.expect(
  not exists (select 1 from pg_policies where schemaname = 'public' and 'anon' = any (roles))
  and not exists (select 1 from pg_policies where schemaname = 'public' and 'public' = any (roles)),
  'no admin policy applies to anon or public');

select test_helpers.expect(
  not exists (select 1 from pg_policies where schemaname = 'public' and qual is not null
              and qual not like '%is_admin()%')
  and not exists (select 1 from pg_policies where schemaname = 'public' and with_check is not null
              and with_check not like '%is_admin()%'),
  'every admin policy is gated by private.is_admin()');

select test_helpers.expect(
  (select count(*) from storage.buckets where id in ('media-originals', 'evidence') and public = false) = 2,
  'both storage buckets exist and are private');

-- ---------------------------------------------------------------------
-- 2. Anonymous visitors see and change nothing
-- ---------------------------------------------------------------------

select test_helpers.act_as_anon();
select test_helpers.expect_error('select * from public.metrics', 'anon cannot read metrics');
select test_helpers.expect_error('select * from public.audit_log', 'anon cannot read the audit log');
select test_helpers.expect_error('select * from public.evidence_files', 'anon cannot read evidence metadata');
select test_helpers.expect_error('select * from public.service_tokens', 'anon cannot read service tokens');
select test_helpers.expect_error(
  $$insert into public.blocked_phrases (phrase, reason) values ('x', 'y')$$, 'anon cannot write');
select test_helpers.expect_error(
  $$select public.confirm_metric_verification('00000000-0000-4000-8000-000000000099', 'x')$$,
  'anon cannot call verification functions');
select test_helpers.expect(
  test_helpers.count_rows('select 1 from storage.objects where bucket_id in (''media-originals'', ''evidence'')') = 0,
  'anon sees no stored objects');
select test_helpers.act_as_owner();

-- ---------------------------------------------------------------------
-- 3. Signed in is not enough: non-admins and admins without MFA see nothing
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect(test_helpers.count_rows('select 1 from public.metrics') = 0,
  'a signed-in non-admin sees no metrics');
select test_helpers.expect(test_helpers.count_rows('select 1 from public.admin_users') = 0,
  'a signed-in non-admin cannot see the admin list');
select test_helpers.expect_error(
  $$insert into public.blocked_phrases (phrase, reason) values ('x', 'y')$$, 'a non-admin cannot write');
select test_helpers.expect_error(
  $$select public.set_metric_evidence_status((select id from public.metrics limit 1), 'verified', 'x')$$,
  'a non-admin cannot change an evidence status');
select test_helpers.act_as_owner();

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal1');
select test_helpers.expect(test_helpers.count_rows('select 1 from public.metrics') = 0,
  'the admin without MFA (aal1) sees no metrics');
select test_helpers.expect_error(
  $$insert into public.blocked_phrases (phrase, reason) values ('x', 'y')$$, 'the admin without MFA cannot write');
select test_helpers.act_as_owner();

-- ---------------------------------------------------------------------
-- 4. Admin with MFA: reads, and the human-verification rule
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

select test_helpers.expect(test_helpers.count_rows('select 1 from public.metrics') = 3,
  'the admin with MFA reads metrics');
select test_helpers.expect(
  (select source_reference from public.metrics where metric_key = 'test.fixture.spend') = 'private reference',
  'the admin can read private source references');

select test_helpers.expect_error(
  $$update public.metrics set value = 120 where metric_key = 'test.fixture.spend'$$,
  'a value change without change_reason is rejected');

update public.metrics set value = 120, change_reason = 'Re-checked in Ads Manager'
 where metric_key = 'test.fixture.spend';

select test_helpers.expect(
  (select evidence_status::text from public.metrics where metric_key = 'test.fixture.spend') = 'documented',
  'changing a value does not change the evidence status');
select test_helpers.expect(
  (select change_reason from public.metrics where metric_key = 'test.fixture.spend') is null,
  'change_reason is not kept on the row');
select test_helpers.expect(
  (select reason from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'test.fixture.spend' order by v.id desc limit 1) = 'Re-checked in Ads Manager',
  'the reason is recorded in metric_versions');
select test_helpers.expect(
  exists (select 1 from public.audit_log where table_name = 'metrics' and action = 'metric.update'),
  'the value change is written to the audit log');

select test_helpers.expect_error(
  $$update public.metrics set evidence_status = 'verified' where metric_key = 'test.fixture.spend'$$,
  'evidence status cannot be written directly');
select test_helpers.expect_error(
  $$update public.metrics set verified_value = 120 where metric_key = 'test.fixture.spend'$$,
  'verification fields cannot be written directly');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
     data_origin, source_type, reporting_period_note, verified_value)
    values ('test.fixture.sneaky', 'n', 'd', 'raw', 'count', 'lead', 1, 'integer', 'platform', 'platform_export', 'n', 1)$$,
  'verification fields cannot be set on insert');

select test_helpers.expect_error(
  $$select public.set_metric_evidence_status((select id from public.metrics where metric_key = 'test.fixture.spend'), 'verified', '  ')$$,
  'an evidence status change requires a reason');
select public.set_metric_evidence_status(
  (select id from public.metrics where metric_key = 'test.fixture.spend'), 'verified', 'Checked in Ads Manager');
select test_helpers.expect(
  (select evidence_status::text from public.metrics where metric_key = 'test.fixture.spend') = 'verified',
  'the admin can explicitly change the evidence status');
select test_helpers.expect(
  (select v.change_kind from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'test.fixture.spend' order by v.id desc limit 1) = 'evidence_status_changed',
  'the status change is versioned as such');

select test_helpers.expect_error(
  $$select public.confirm_metric_verification((select id from public.metrics where metric_key = 'test.fixture.spend'), '')$$,
  'confirming a source check requires a note');
select public.confirm_metric_verification(
  (select id from public.metrics where metric_key = 'test.fixture.spend'), 'Ads Manager › Campaigns › Amount spent');
select test_helpers.expect(
  (select verified_value = 120 and verified_status = 'verified' and verification_source = 'admin_confirmation'
          and verified_by = '00000000-0000-4000-8000-000000000001'
     from public.metrics where metric_key = 'test.fixture.spend'),
  'confirming records value, status, time and the admin');

update public.metrics set value = 150, change_reason = 'Corrected after a second export'
 where metric_key = 'test.fixture.spend';
select test_helpers.expect(
  (select value = 150 and verified_value = 120 and evidence_status = 'verified'
     from public.metrics where metric_key = 'test.fixture.spend'),
  'a later edit leaves status and verification untouched, so the change since verification is visible');

-- Defence in depth: even if a future migration granted these columns, the trigger still refuses.
select test_helpers.act_as_owner();
grant update (evidence_status, verified_value, metric_key) on public.metrics to authenticated;
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select test_helpers.expect_error(
  $$update public.metrics set evidence_status = 'reported' where metric_key = 'test.fixture.spend'$$,
  'the trigger refuses direct evidence status writes');
select test_helpers.expect_error(
  $$update public.metrics set verified_value = 1 where metric_key = 'test.fixture.spend'$$,
  'the trigger refuses direct verification writes');
select test_helpers.expect_error(
  $$update public.metrics set metric_key = 'test.fixture.renamed' where metric_key = 'test.fixture.leads'$$,
  'the trigger refuses metric key changes');
select test_helpers.act_as_owner();
revoke update (evidence_status, verified_value, metric_key) on public.metrics from authenticated;
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

-- ---------------------------------------------------------------------
-- 5. Metric integrity
-- ---------------------------------------------------------------------

select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, formula, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.bad_fn', 'n', 'd', 'calculated', 'count', 'lead', '{"fn":"eval","expr":"1+1"}', 'integer',
            'derived', 'calculation', 'n')$$,
  'free-form formulas are rejected');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, formula, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.missing', 'n', 'd', 'calculated', 'count', 'lead', '{"fn":"sum","terms":["test.fixture.nope"]}',
            'integer', 'derived', 'calculation', 'n')$$,
  'a formula reading a missing metric is rejected');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, formula, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.self', 'n', 'd', 'calculated', 'count', 'lead', '{"fn":"sum","terms":["test.fixture.self"]}',
            'integer', 'derived', 'calculation', 'n')$$,
  'a formula reading itself is rejected');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, formula, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.raw_formula', 'n', 'd', 'raw', 'count', 'lead', 1, '{"fn":"sum","terms":["test.fixture.leads"]}',
            'integer', 'platform', 'platform_export', 'n')$$,
  'a raw metric cannot carry a formula');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.legacy', 'n', 'd', 'legacy_fixed', 'count', 'lead', 1, 'integer', 'platform', 'platform_export', 'n')$$,
  'a legacy-fixed metric needs a method note');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, value, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.currency', 'n', 'd', 'raw', 'count', 'lead', 'INR', 1, 'integer', 'platform', 'platform_export', 'n')$$,
  'currency must match the value type');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
     data_origin, source_type, reporting_period_note)
    values ('Bad Key', 'n', 'd', 'raw', 'count', 'lead', 1, 'integer', 'platform', 'platform_export', 'n')$$,
  'metric keys must follow <dataset>.<entity>.<measure>');

insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, formula, display_format,
  data_origin, source_type, reporting_period_note)
values ('test.fixture.cpl_total', 'n', 'd', 'calculated', 'currency', 'inr', 'INR',
        '{"fn":"sum","terms":["test.fixture.cpl"]}', 'inr', 'derived', 'calculation', 'n');
select test_helpers.expect_error(
  $$update public.metrics set formula = '{"fn":"ratio","numerator":"test.fixture.cpl_total","denominator":"test.fixture.leads"}',
       change_reason = 'test' where metric_key = 'test.fixture.cpl'$$,
  'circular formulas are rejected');

insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, display_format,
  data_origin, source_type, reporting_period_note)
values ('test.fixture.retired', 'n', 'd', 'raw', 'count', 'lead', 3, 'integer', 'platform', 'platform_export', 'n'),
       ('test.fixture.clicks', 'n', 'd', 'raw', 'count', 'click', 9, 'integer', 'platform', 'platform_export', 'n');
select public.archive_metric((select id from public.metrics where metric_key = 'test.fixture.retired'), 'Fixture retired');
select test_helpers.expect_error(
  $$insert into public.metrics (metric_key, name, description, kind, value_type, unit, formula, display_format,
     data_origin, source_type, reporting_period_note)
    values ('test.fixture.uses_retired', 'n', 'd', 'calculated', 'count', 'lead', '{"fn":"sum","terms":["test.fixture.retired"]}',
            'integer', 'derived', 'calculation', 'n')$$,
  'a formula cannot read an archived metric');

select test_helpers.expect_error(
  $$update public.metrics set metric_key = 'test.fixture.renamed' where metric_key = 'test.fixture.leads'$$,
  'metric keys cannot change');
select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'test.fixture.leads'))$$,
  'a metric used by a formula cannot be archived');
select test_helpers.expect_error(
  $$delete from public.metrics where metric_key = 'test.fixture.cpl_total'$$,
  'metrics cannot be deleted (archive instead)');

-- ---------------------------------------------------------------------
-- 6. History and audit are append-only
-- ---------------------------------------------------------------------

select test_helpers.expect_error('update public.metric_versions set reason = ''x''', 'the admin cannot edit metric history');
select test_helpers.expect_error('delete from public.audit_log', 'the admin cannot delete audit entries');
select test_helpers.act_as_owner();

select test_helpers.expect_error('update public.audit_log set action = ''x''', 'audit entries are immutable even for the owner role');
select test_helpers.expect_error('delete from public.audit_log', 'audit entries cannot be deleted even by the owner role');
select test_helpers.expect_error('update public.metric_versions set reason = ''x''', 'metric history is immutable even for the owner role');

-- ---------------------------------------------------------------------
-- 7. Service tokens: metadata only, hash never readable or logged
-- ---------------------------------------------------------------------

insert into public.service_tokens (name, token_hash, scopes)
values ('build', repeat('a', 64), array['release:read', 'media:sign']);

select test_helpers.expect(
  not exists (select 1 from public.audit_log where table_name = 'service_tokens' and new_data ? 'token_hash'),
  'token hashes are redacted from the audit log');

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select test_helpers.expect(test_helpers.count_rows('select id, name, scopes from public.service_tokens') = 1,
  'the admin can see token metadata');
select test_helpers.expect_error('select token_hash from public.service_tokens', 'the admin cannot read token hashes');
select test_helpers.expect_error(
  $$insert into public.service_tokens (name, token_hash, scopes) values ('backup', repeat('b', 64), array['backup:export'])$$,
  'the admin cannot create service tokens');
select test_helpers.act_as_owner();

-- ---------------------------------------------------------------------
-- 8. Releases: server-side only, one in progress, legal transitions
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select test_helpers.expect_error(
  $$insert into public.releases (summary) values ('from the browser')$$, 'the admin cannot create releases directly');
select test_helpers.act_as_owner();

insert into public.releases (summary) values ('Release A');
select test_helpers.expect_error(
  $$update public.releases set status = 'queued' where summary = 'Release A'$$,
  'a release cannot be queued without a frozen snapshot');
update public.releases set status = 'queued', snapshot = '{"schemaVersion":1}', snapshot_sha256 = repeat('c', 64)
 where summary = 'Release A';
select test_helpers.expect_error(
  $$update public.releases set snapshot = '{"schemaVersion":2}' where summary = 'Release A'$$,
  'a queued release snapshot is frozen');
select test_helpers.expect_error(
  $$update public.releases set status = 'live', live_at = now() where summary = 'Release A'$$,
  'illegal release transitions are rejected (queued → live)');
insert into public.releases (summary, snapshot, snapshot_sha256) values ('Release B', '{"schemaVersion":1}', repeat('d', 64));
select test_helpers.expect_error(
  $$update public.releases set status = 'queued' where summary = 'Release B'$$,
  'only one release can be in progress');

-- ---------------------------------------------------------------------
-- 9. Documents and revisions
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
insert into public.documents (doc_type, slug, schema_version, draft)
values ('case_study', 'fixture-case-study', 1, '{"summary":{"title":"Fixture"}}');
select test_helpers.expect(
  (select status::text from public.documents where slug = 'fixture-case-study') = 'draft',
  'the admin can create a draft document');
select test_helpers.expect_error(
  $$update public.documents set slug = 'renamed' where slug = 'fixture-case-study'$$, 'slugs cannot change');
select test_helpers.expect_error(
  $$update public.documents set status = 'published' where slug = 'fixture-case-study'$$,
  'the admin cannot publish directly');
select test_helpers.expect_error(
  $$insert into public.documents (doc_type, slug, schema_version, draft) values ('about', 'about', 1, '[]')$$,
  'a document draft must be an object');
select test_helpers.act_as_owner();

select test_helpers.expect_error(
  $$update public.documents set slug = 'renamed' where slug = 'fixture-case-study'$$,
  'slugs cannot change even for the owner role');
select test_helpers.expect_error(
  $$update public.documents set status = 'published' where slug = 'fixture-case-study'$$,
  'a published document must have a published revision');
insert into public.document_revisions (document_id, content, schema_version)
select id, draft, schema_version from public.documents where slug = 'fixture-case-study';
select test_helpers.expect(
  (select revision_number from public.document_revisions r join public.documents d on d.id = r.document_id
    where d.slug = 'fixture-case-study') = 1,
  'revisions are numbered automatically');
select test_helpers.expect_error(
  $$update public.document_revisions set content = '{}'$$, 'revisions are immutable');
update public.document_revisions set release_id = (select id from public.releases where summary = 'Release A');
select test_helpers.expect(
  (select release_id is not null from public.document_revisions limit 1),
  'the publish pipeline can link an unlinked revision to its release');

-- ---------------------------------------------------------------------
-- 10. Admin allow-list
-- ---------------------------------------------------------------------

select test_helpers.expect_error(
  $$select private.grant_admin_owner('someone-else@example.test')$$, 'there can only be one owner');
select test_helpers.expect_error(
  $$select private.grant_admin_owner('nobody@example.test')$$, 'owners must be existing auth users');

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select test_helpers.expect_error(
  $$insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-000000000002')$$,
  'the admin cannot add admins through the API');
select test_helpers.expect_error(
  $$select private.grant_admin_owner('someone-else@example.test')$$, 'API roles cannot run the bootstrap function');
select test_helpers.act_as_owner();

-- ---------------------------------------------------------------------
-- 11. Evidence, media, linked phrases, redirects
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

select test_helpers.expect_error(
  $$insert into public.evidence_files (object_path, original_filename, mime_type, byte_size, sha256, description)
    values ('x/too-big.csv', 'too-big.csv', 'text/csv', 20971521, repeat('e', 64), 'too big')$$,
  'evidence files over 20 MB are rejected');
select test_helpers.expect_error(
  $$insert into public.evidence_files (object_path, original_filename, mime_type, byte_size, sha256, description)
    values ('x/macro.xlsm', 'macro.xlsm', 'application/vnd.ms-excel.sheet.macroEnabled.12', 10, repeat('e', 64), 'macro')$$,
  'macro-enabled spreadsheets are rejected');
insert into public.evidence_files (object_path, original_filename, mime_type, byte_size, sha256, description)
values ('fixture/export.csv', 'export.csv', 'text/csv', 1024, repeat('e', 64), 'Fixture export');
select test_helpers.expect_error(
  $$update public.evidence_files set sha256 = repeat('f', 64) where object_path = 'fixture/export.csv'$$,
  'an evidence file cannot be swapped in place');
select test_helpers.act_as_owner();
select test_helpers.expect_error(
  $$update public.evidence_files set sha256 = repeat('f', 64) where object_path = 'fixture/export.csv'$$,
  'an evidence file cannot be swapped in place even by the owner role');
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

insert into public.media_assets (object_path, original_filename, mime_type, byte_size, width, height, sha256, kind, alt_text)
values ('fixture/v1/hero.webp', 'hero.webp', 'image/webp', 2048, 1600, 900, repeat('a', 64), 'case_study_image', 'Fixture');
insert into public.media_usages (asset_id, document_id, field_path)
select m.id, d.id, 'summary.image' from public.media_assets m, public.documents d
 where m.object_path = 'fixture/v1/hero.webp' and d.slug = 'fixture-case-study';
select test_helpers.expect_error(
  $$update public.media_assets set archived_at = now() where object_path = 'fixture/v1/hero.webp'$$,
  'media in use cannot be archived');
select test_helpers.expect_error(
  $$insert into public.media_assets (object_path, original_filename, mime_type, byte_size, sha256, kind)
    values ('../escape.png', 'x.png', 'image/png', 10, repeat('a', 64), 'site')$$,
  'object paths cannot traverse directories');

select test_helpers.expect_error(
  $$insert into public.linked_phrases (location, phrase, metric_keys, reason)
    values ('fixture', 'roughly', array['test.fixture.missing'], 'r')$$,
  'linked phrases must reference existing metrics');
insert into public.linked_phrases (location, phrase, metric_keys, reason, reviewed_at)
values ('fixture', 'roughly a third', array['test.fixture.cpl'], 'Qualitative restatement', now());
select test_helpers.expect(
  (select reviewed_by from public.linked_phrases where phrase = 'roughly a third') = '00000000-0000-4000-8000-000000000001',
  'the reviewer is stamped from the session');

insert into public.linked_phrases (location, phrase, metric_keys, reason)
values ('fixture', 'nearly doubled', array['test.fixture.cpl_total'], 'Qualitative restatement');
select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'test.fixture.cpl_total'))$$,
  'a metric referenced by a linked phrase cannot be archived');
delete from public.linked_phrases where phrase = 'nearly doubled';
select public.archive_metric((select id from public.metrics where metric_key = 'test.fixture.cpl_total'));
select test_helpers.expect(
  (select archived_at is not null from public.metrics where metric_key = 'test.fixture.cpl_total'),
  'once the linked phrase is removed, the metric can be archived');

select test_helpers.expect_error(
  $$insert into public.redirects (from_path, to_path, reason) values ('/a/', '/a/', 'loop')$$,
  'a redirect cannot point to itself');

-- Metric references from page content and linked phrases (migration 8)
select test_helpers.expect_error(
  $$insert into public.document_metric_refs (document_id, field_path, metric_id)
    select d.id, 'summary.title', m.id from public.documents d, public.metrics m
     where d.slug = 'fixture-case-study' and m.metric_key = 'test.fixture.retired'$$,
  'page content cannot reference an archived metric');
select test_helpers.expect_error(
  $$insert into public.linked_phrases (location, phrase, metric_keys, reason)
    values ('fixture', 'a handful', array['test.fixture.retired'], 'Qualitative restatement')$$,
  'a linked phrase cannot reference an archived metric');
insert into public.document_metric_refs (document_id, field_path, metric_id)
select d.id, 'summary.clicks', m.id from public.documents d, public.metrics m
 where d.slug = 'fixture-case-study' and m.metric_key = 'test.fixture.clicks';
select test_helpers.expect_error(
  $$select public.archive_metric((select id from public.metrics where metric_key = 'test.fixture.clicks'))$$,
  'a metric referenced by page content cannot be archived');

-- ---------------------------------------------------------------------
-- 12. Storage
-- ---------------------------------------------------------------------

insert into storage.objects (bucket_id, name) values ('evidence', 'fixture/export.csv');
select test_helpers.expect(
  test_helpers.count_rows('select 1 from storage.objects where bucket_id = ''evidence''') = 1,
  'the admin can upload and read private evidence');
delete from storage.objects where bucket_id = 'evidence';
select test_helpers.act_as_owner();

select test_helpers.expect(
  (select count(*) from storage.objects where bucket_id = 'evidence') = 1,
  'stored objects cannot be deleted through the API');

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect_error(
  $$insert into storage.objects (bucket_id, name) values ('media-originals', 'x/intruder.png')$$,
  'a non-admin cannot upload');
select test_helpers.expect(
  test_helpers.count_rows('select 1 from storage.objects where bucket_id in (''media-originals'', ''evidence'')') = 0,
  'a non-admin cannot see stored objects');
select test_helpers.act_as_owner();

-- ---------------------------------------------------------------------
-- 13. Actors cannot be spoofed
-- ---------------------------------------------------------------------

select test_helpers.expect(
  (select created_by from public.documents where slug = 'fixture-case-study') = '00000000-0000-4000-8000-000000000001',
  'created_by comes from the session');

select 'ALL ADMIN FOUNDATION TESTS PASSED' as result;

rollback;
