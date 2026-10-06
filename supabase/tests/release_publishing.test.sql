-- =====================================================================
-- Phase 5C — release management and publishing (migration 20260924000100)
--
-- One transaction, rolled back. Fixture users are example.test addresses.
-- A small fixture site (three metrics, a homepage, a linked phrase) with a
-- published baseline release, then every path through the lifecycle:
-- no-op, validation failure, concurrency, failed publish, successful
-- publish, rollback, cancellation and access control.
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

-- A release by its summary, and its current updated_at (the optimistic-concurrency token).
create function test_helpers.release_id(p_summary text)
returns bigint language sql as $$ select id from public.releases where summary = p_summary $$;
create function test_helpers.release_stamp(p_summary text)
returns timestamptz language sql as $$ select updated_at from public.releases where summary = p_summary $$;
create function test_helpers.release_sha(p_summary text)
returns text language sql as $$ select snapshot_sha256 from public.releases where summary = p_summary $$;

-- Validate, approve, start and record the build of a release, as the caller.
create function test_helpers.advance_to_publishing(p_summary text)
returns void language plpgsql as $$
begin
  perform public.validate_release(test_helpers.release_id(p_summary), test_helpers.release_stamp(p_summary), '[]'::jsonb);
  perform public.approve_release(test_helpers.release_id(p_summary), test_helpers.release_stamp(p_summary), test_helpers.release_sha(p_summary));
  perform public.start_release_publish(test_helpers.release_id(p_summary), test_helpers.release_stamp(p_summary));
end;
$$;

grant execute on all functions in schema test_helpers to anon, authenticated;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('00000000-0000-4000-8000-000000000002', 'someone-else@example.test');
select private.grant_admin_owner('owner@example.test');

-- ---------------------------------------------------------------------
-- Fixtures, created as the owner: the state the live site was built from.
-- ---------------------------------------------------------------------

insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, value, display_format,
  evidence_status, data_origin, source_type, reporting_period_note)
values
  ('rp.fixture.spend', 'Spend', 'Fixture spend.', 'raw', 'currency', 'inr', 'INR', 1000, 'inr', 'documented',
   'platform', 'platform_export', 'Not recorded.'),
  ('rp.fixture.leads', 'Leads', 'Fixture leads.', 'raw', 'count', 'lead', null, 10, 'integer', 'documented',
   'platform', 'platform_export', 'Not recorded.'),
  ('rp.fixture.retired', 'Retired', 'Fixture retired.', 'raw', 'count', 'lead', null, 1, 'integer', null,
   'platform', 'platform_export', 'Not recorded.');
insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, formula, display_format,
  evidence_status, data_origin, source_type, reporting_period_note)
values
  ('rp.fixture.cpl', 'CPL', 'Fixture CPL.', 'calculated', 'currency', 'inr', 'INR',
   '{"fn":"ratio","numerator":"rp.fixture.spend","denominator":"rp.fixture.leads"}', 'inr', 'calculated',
   'derived', 'calculation', 'Not recorded.');
update public.metrics set archived_at = now() where metric_key = 'rp.fixture.retired';

insert into public.documents (doc_type, slug, schema_version, draft)
values ('homepage', 'rp-home', 1, '{"hero":{"h1":"Growth you can check","proof":"{{metric:rp.fixture.leads}} leads"}}');
insert into public.document_revisions (document_id, content, schema_version, change_summary)
select id, draft, schema_version, 'Baseline' from public.documents where slug = 'rp-home';
update public.documents d set published_revision_id = r.id, status = 'published'
  from public.document_revisions r where r.document_id = d.id and d.slug = 'rp-home';
insert into public.document_metric_refs (document_id, field_path, metric_id)
select d.id, 'hero.proof', m.id from public.documents d, public.metrics m
 where d.slug = 'rp-home' and m.metric_key = 'rp.fixture.leads';
insert into public.linked_phrases (location, phrase, metric_keys, reason)
values ('home › hero', 'ten leads', array['rp.fixture.leads'], 'Restates the lead count');

-- The published baseline (what scripts/db/import-release-baseline.mjs records in production).
insert into public.releases (kind, status, origin, summary, snapshot, snapshot_sha256, live_at, document_revisions)
select 'publish', 'published', 'baseline_import', 'Baseline', s.snapshot, private.snapshot_sha256(s.snapshot), now(),
       private.current_document_revisions()
  from (select jsonb_set(private.compose_release_snapshot('{}'::jsonb, 'Baseline'), '{kind}', '"baseline"') as snapshot) s;

select test_helpers.expect(
  (select count(*) = 1 from public.releases where status = 'published'),
  'the baseline release is the one published release');

-- ---------------------------------------------------------------------
-- 1. Nothing to release
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

select test_helpers.expect(
  jsonb_array_length(public.preview_release_changes() -> 'items') = 0,
  'with no draft changes the preview is empty');
select test_helpers.expect(
  test_helpers.error_of($$select public.create_release('Nothing changed')$$) like 'There are no draft changes%',
  'a release with no real change is refused');
select test_helpers.expect(
  test_helpers.error_of($$select public.create_release('   ')$$) like 'A release summary is required%',
  'a release needs a summary');

-- ---------------------------------------------------------------------
-- 2. Drafts: saving never publishes
-- ---------------------------------------------------------------------

select public.save_document_draft(d.id, d.updated_at,
         jsonb_set(d.draft, '{hero,h1}', '"Growth you can verify"'), 'Sharper headline')
  from public.documents d where d.slug = 'rp-home';
update public.metrics set value = 1200, change_reason = 'Late conversions' where metric_key = 'rp.fixture.spend';

select test_helpers.expect(
  (select r.content #>> '{hero,h1}' = 'Growth you can check'
     from public.documents d join public.document_revisions r on r.id = d.published_revision_id where d.slug = 'rp-home'),
  'a saved draft leaves the published revision untouched');
select test_helpers.expect(
  (select snapshot #>> '{documents,homepage,content,hero,h1}' = 'Growth you can check'
          and (select e.item ->> 'value' from jsonb_array_elements(snapshot -> 'metrics') e(item) where e.item ->> 'id' = 'rp.fixture.spend') = '1000'
     from public.releases where status = 'published'),
  'a saved draft leaves the published baseline untouched');
select test_helpers.expect(
  (select jsonb_agg(i.item ->> 'entityKey' order by i.item ->> 'entityKey')
     from jsonb_array_elements(public.preview_release_changes() -> 'items') i(item))
    = '["homepage/rp-home", "rp.fixture.spend"]'::jsonb,
  'the preview lists exactly the changed document and metric (the calculated CPL follows at build time)');

-- ---------------------------------------------------------------------
-- 3. Release creation
-- ---------------------------------------------------------------------

select public.create_release('Release A');
select test_helpers.expect(
  (select status = 'draft' and kind = 'publish' and base_release_id = test_helpers.release_id('Baseline')
          and created_by = '00000000-0000-4000-8000-000000000001'
          and snapshot_sha256 = encode(sha256(convert_to(snapshot::text, 'UTF8')), 'hex')
     from public.releases where summary = 'Release A'),
  'a new release is a draft against the published release, hashed, with its creator recorded');
select test_helpers.expect(
  (select snapshot #>> '{documents,homepage,content,hero,h1}' = 'Growth you can verify' and snapshot ->> 'kind' = 'release'
     from public.releases where summary = 'Release A'),
  'the release captures the current drafts');
select test_helpers.expect(
  (select count(*) = 2
          and bool_and(case i.entity_type
                         when 'document' then i.document_revision_id is not null and i.diff -> 'fields' = '["content.hero.h1"]'
                         when 'metric' then i.metric_version_id is not null and i.diff -> 'fields' = '["value"]'
                                            and i.diff #>> '{before,value}' = '1000' and i.diff #>> '{after,value}' = '1200'
                       end)
     from public.release_items i where i.release_id = test_helpers.release_id('Release A')),
  'release items name each changed entity, the immutable version or revision, the changed fields and before/after values');
select test_helpers.expect(
  public.release_snapshot_text(test_helpers.release_id('Release A')) = (select snapshot::text from public.releases where summary = 'Release A')
  and encode(sha256(convert_to(public.release_snapshot_text(test_helpers.release_id('Release A')), 'UTF8')), 'hex') = test_helpers.release_sha('Release A'),
  'the downloadable snapshot text hashes to the recorded SHA-256');
select test_helpers.expect(
  test_helpers.error_of($$select public.create_release('Another')$$) like 'Release % is still open%',
  'only one release can be open at a time');
select test_helpers.expect_error(
  $$update public.releases set status = 'review' where summary = 'Release A'$$,
  'the admin cannot change a release directly');
select test_helpers.expect_error(
  $$insert into public.release_items (release_id, entity_type, entity_id) values (1, 'metric', gen_random_uuid())$$,
  'the admin cannot add release items directly');

-- ---------------------------------------------------------------------
-- 4. Validation
-- ---------------------------------------------------------------------

select test_helpers.expect(
  test_helpers.error_of(format('select public.validate_release(%s, %L, %L)',
    test_helpers.release_id('Release A'), '2000-01-01T00:00:00Z', '[]')) like '%changed after you opened it%',
  'a stale copy of the release is refused (optimistic concurrency)');

select public.validate_release(test_helpers.release_id('Release A'), test_helpers.release_stamp('Release A'),
                               '["documents.homepage.content.hero.h1: Too long"]'::jsonb);
select test_helpers.expect(
  (select status = 'draft' and (validation ->> 'passed')::boolean = false
          and exists (select 1 from jsonb_array_elements(validation -> 'checks') c(item)
                       where c.item ->> 'code' = 'document_schema' and (c.item ->> 'ok')::boolean = false)
     from public.releases where summary = 'Release A'),
  'a schema failure blocks the release: it stays a draft with the reason recorded');
select test_helpers.expect(
  test_helpers.error_of(format('select public.approve_release(%s, %L, %L)', test_helpers.release_id('Release A'),
    test_helpers.release_stamp('Release A'), test_helpers.release_sha('Release A'))) like 'Only a release in review%',
  'a release that failed validation cannot be approved');

select public.validate_release(test_helpers.release_id('Release A'), test_helpers.release_stamp('Release A'), '[]'::jsonb);
select test_helpers.expect(
  (select status = 'review' and (validation ->> 'passed')::boolean
          and validated_by = '00000000-0000-4000-8000-000000000001'
          and (select count(*) = 8 from jsonb_array_elements(validation -> 'checks'))
     from public.releases where summary = 'Release A'),
  'a release that passes all eight checks moves to review');
select test_helpers.expect(
  (select string_agg(c.item ->> 'code', ',' order by c.ordinality) from public.releases r,
          jsonb_array_elements(r.validation -> 'checks') with ordinality c(item, ordinality) where r.summary = 'Release A')
    = 'has_changes,current_base,drafts_unchanged,protected_tokens,metric_references,no_duplicates,required_fields,document_schema',
  'validation covers changes, base, concurrency, tokens, references, duplicates, required fields and schema');

-- ---------------------------------------------------------------------
-- 5. Approval and a failed publish
-- ---------------------------------------------------------------------

select test_helpers.expect(
  test_helpers.error_of(format('select public.approve_release(%s, %L, %L)', test_helpers.release_id('Release A'),
    test_helpers.release_stamp('Release A'), repeat('0', 64))) like 'The reviewed snapshot does not match%',
  'approval names the exact snapshot that was reviewed');
select public.approve_release(test_helpers.release_id('Release A'), test_helpers.release_stamp('Release A'), test_helpers.release_sha('Release A'));
select test_helpers.expect(
  test_helpers.error_of(format('select public.mark_release_published(%s, %L, true)', test_helpers.release_id('Release A'),
    test_helpers.release_stamp('Release A'))) like 'Only a publishing release%',
  'an approved release cannot be marked published before publishing starts');
select public.start_release_publish(test_helpers.release_id('Release A'), test_helpers.release_stamp('Release A'));
select test_helpers.expect(
  test_helpers.error_of(format('select public.mark_release_published(%s, %L, true)', test_helpers.release_id('Release A'),
    test_helpers.release_stamp('Release A'))) like 'Record the verified build%',
  'a release cannot be marked published without a verified build');

select public.record_release_failure(test_helpers.release_id('Release A'), test_helpers.release_stamp('Release A'),
                                     'build', 'The static build failed');
select test_helpers.expect(
  (select status = 'failed' and failure_stage = 'build' and failed_at is not null from public.releases where summary = 'Release A'),
  'a failed publish is recorded with its stage');
select test_helpers.expect(
  (select status = 'published' from public.releases where summary = 'Baseline')
  and (select r.content #>> '{hero,h1}' = 'Growth you can check'
         from public.documents d join public.document_revisions r on r.id = d.published_revision_id where d.slug = 'rp-home')
  and (select count(*) = 0 from public.metric_versions where release_id = test_helpers.release_id('Release A')),
  'a failed release leaves the published baseline, the published revision and history links untouched');

-- ---------------------------------------------------------------------
-- 6. A successful publish
-- ---------------------------------------------------------------------

select public.create_release('Release B');
select test_helpers.advance_to_publishing('Release B');
select test_helpers.expect(
  test_helpers.error_of(format('select public.record_release_build(%s, %L, %L)', test_helpers.release_id('Release B'),
    test_helpers.release_stamp('Release B'), 'not-a-hash')) like 'The build SHA-256 must be%',
  'the build is identified by a real SHA-256');
select public.record_release_build(test_helpers.release_id('Release B'), test_helpers.release_stamp('Release B'), repeat('b', 64));
select test_helpers.expect(
  test_helpers.error_of(format('select public.mark_release_published(%s, %L, false)', test_helpers.release_id('Release B'),
    test_helpers.release_stamp('Release B'))) like 'Confirm that the verified build%',
  'marking published needs the admin''s explicit deployment confirmation');
select public.mark_release_published(test_helpers.release_id('Release B'), test_helpers.release_stamp('Release B'), true);

select test_helpers.expect(
  (select status = 'published' and previous_release_id = test_helpers.release_id('Baseline') and live_at is not null
          and deployment_confirmed_by = '00000000-0000-4000-8000-000000000001' and build_sha256 = repeat('b', 64)
     from public.releases where summary = 'Release B')
  and (select status = 'superseded' from public.releases where summary = 'Baseline'),
  'the published release records the previous one, which is superseded');
select test_helpers.expect(
  (select r.content #>> '{hero,h1}' = 'Growth you can verify' and r.release_id = test_helpers.release_id('Release B')
     from public.documents d join public.document_revisions r on r.id = d.published_revision_id where d.slug = 'rp-home'),
  'the document now points at the published revision, linked to its release');
select test_helpers.expect(
  (select v.release_id = test_helpers.release_id('Release B')
     from public.metric_versions v join public.metrics m on m.id = v.metric_id
    where m.metric_key = 'rp.fixture.spend' order by v.id desc limit 1),
  'the published metric version is linked to its release');
select test_helpers.expect(
  jsonb_array_length(public.preview_release_changes() -> 'items') = 0,
  'after publishing there are no unpublished changes');
select test_helpers.expect(
  (select draft #>> '{hero,h1}' = 'Growth you can verify' from public.documents where slug = 'rp-home'),
  'publishing does not rewrite the draft');

-- ---------------------------------------------------------------------
-- 7. Concurrency: drafts that change after the release was created
-- ---------------------------------------------------------------------

update public.metrics set value = 11, change_reason = 'Recount' where metric_key = 'rp.fixture.leads';
select public.create_release('Release C');
update public.metrics set value = 12, change_reason = 'Recount again' where metric_key = 'rp.fixture.leads';
select public.validate_release(test_helpers.release_id('Release C'), test_helpers.release_stamp('Release C'), '[]'::jsonb);
select test_helpers.expect(
  (select status = 'draft' and exists (select 1 from jsonb_array_elements(validation -> 'checks') c(item)
                                        where c.item ->> 'code' = 'drafts_unchanged' and (c.item ->> 'ok')::boolean = false)
     from public.releases where summary = 'Release C'),
  'a draft edited after the release was created blocks validation');
select test_helpers.expect(
  test_helpers.error_of(format('select public.cancel_release(%s, %L, %L)', test_helpers.release_id('Release C'),
    test_helpers.release_stamp('Release C'), ' ')) like 'A reason is required%',
  'cancelling needs a reason');
select public.cancel_release(test_helpers.release_id('Release C'), test_helpers.release_stamp('Release C'), 'Drafts moved on');
select test_helpers.expect(
  (select status = 'cancelled' and cancel_reason = 'Drafts moved on' from public.releases where summary = 'Release C'),
  'a stale release is cancelled, not deleted');

-- ---------------------------------------------------------------------
-- 8. Protected tokens and metric references
-- ---------------------------------------------------------------------

-- Changing tokens is impossible through save_document_draft, so the owner
-- stands in for any other path that might write a draft.
select test_helpers.act_as_owner();
update public.documents set draft = jsonb_set(draft, '{hero,proof}', '"{{metric:rp.fixture.retired}} leads"') where slug = 'rp-home';
insert into public.document_revisions (document_id, content, schema_version, change_summary)
select id, draft, schema_version, 'Token change' from public.documents where slug = 'rp-home';
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

select public.create_release('Release D');
select public.validate_release(test_helpers.release_id('Release D'), test_helpers.release_stamp('Release D'), '[]'::jsonb);
select test_helpers.expect(
  (select status = 'draft'
          and exists (select 1 from jsonb_array_elements(validation -> 'checks') c(item)
                       where c.item ->> 'code' = 'protected_tokens' and (c.item ->> 'ok')::boolean = false)
          and exists (select 1 from jsonb_array_elements(validation -> 'checks') c(item)
                       where c.item ->> 'code' = 'metric_references' and (c.item ->> 'ok')::boolean = false
                         and c.item ->> 'details' like '%archived metric rp.fixture.retired%')
     from public.releases where summary = 'Release D'),
  'a changed token and a reference to an archived metric both block the release, with the reason');
select public.cancel_release(test_helpers.release_id('Release D'), test_helpers.release_stamp('Release D'), 'Token change');

select test_helpers.act_as_owner();
update public.documents set draft = jsonb_set(draft, '{hero,proof}', '"{{metric:rp.fixture.leads leads"') where slug = 'rp-home';
insert into public.document_revisions (document_id, content, schema_version, change_summary)
select id, draft, schema_version, 'Malformed token' from public.documents where slug = 'rp-home';
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');
select public.create_release('Release E');
select public.validate_release(test_helpers.release_id('Release E'), test_helpers.release_stamp('Release E'), '[]'::jsonb);
select test_helpers.expect(
  (select status = 'draft' and exists (select 1 from jsonb_array_elements(validation -> 'checks') c(item)
                                        where c.item ->> 'code' = 'metric_references' and c.item ->> 'details' like '%malformed token%')
     from public.releases where summary = 'Release E'),
  'a malformed token blocks the release');
select public.cancel_release(test_helpers.release_id('Release E'), test_helpers.release_stamp('Release E'), 'Malformed token');

-- Restore the published draft (a new revision; history is never deleted).
select test_helpers.act_as_owner();
update public.documents d set draft = r.content
  from public.document_revisions r where r.id = d.published_revision_id and d.slug = 'rp-home';
insert into public.document_revisions (document_id, content, schema_version, change_summary)
select id, draft, schema_version, 'Reset to published' from public.documents where slug = 'rp-home';
select test_helpers.expect(
  (select count(*) = 5 from public.document_revisions r join public.documents d on d.id = r.document_id where d.slug = 'rp-home'),
  'resetting a draft adds a revision and keeps every earlier one');
select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal2');

-- ---------------------------------------------------------------------
-- 9. Rollback
-- ---------------------------------------------------------------------

select public.create_rollback_release('Roll back Release B');
select test_helpers.expect(
  (select kind = 'rollback' and rollback_of = test_helpers.release_id('Release B')
          and restores_release_id = test_helpers.release_id('Baseline')
          and snapshot #>> '{documents,homepage,content,hero,h1}' = 'Growth you can check'
     from public.releases where summary = 'Roll back Release B'),
  'a rollback release restores the previous published state');
select test_helpers.advance_to_publishing('Roll back Release B');
select public.record_release_build(test_helpers.release_id('Roll back Release B'), test_helpers.release_stamp('Roll back Release B'), repeat('c', 64));
select public.mark_release_published(test_helpers.release_id('Roll back Release B'), test_helpers.release_stamp('Roll back Release B'), true);
select test_helpers.expect(
  (select status = 'rolled_back' from public.releases where summary = 'Release B')
  and (select status = 'published' and previous_release_id = test_helpers.release_id('Release B')
         from public.releases where summary = 'Roll back Release B'),
  'the undone release is marked rolled back and the rollback is the published release');
select test_helpers.expect(
  (select r.content #>> '{hero,h1}' = 'Growth you can check'
     from public.documents d join public.document_revisions r on r.id = d.published_revision_id where d.slug = 'rp-home')
  and (select draft #>> '{hero,h1}' = 'Growth you can verify' and value = 12
         from public.documents, public.metrics where slug = 'rp-home' and metric_key = 'rp.fixture.leads'),
  'a rollback moves the published revision back and does not modify any draft');
select test_helpers.expect(
  (select jsonb_agg(i.item ->> 'entityKey' order by i.item ->> 'entityKey')
     from jsonb_array_elements(public.preview_release_changes() -> 'items') i(item))
    = '["homepage/rp-home", "rp.fixture.leads", "rp.fixture.spend"]'::jsonb,
  'after a rollback the drafts show as unpublished changes again');

-- ---------------------------------------------------------------------
-- 10. Audit log
-- ---------------------------------------------------------------------

select test_helpers.expect(
  (select array_agg(distinct action order by action) from public.audit_log
    where table_name = 'releases' and action not in ('insert', 'update'))
    = array['publish_failed', 'publish_started', 'publish_succeeded', 'release_approved', 'release_build_verified',
            'release_cancelled', 'release_created', 'release_validated', 'rollback_started', 'rollback_succeeded'],
  'every release action is in the audit log');
select test_helpers.expect(
  (select bool_and(actor_id = '00000000-0000-4000-8000-000000000001' and record_id is not null and occurred_at is not null)
     from public.audit_log where table_name = 'releases' and action like '%publish%'),
  'audit entries record the actor, the release and the time');
select test_helpers.expect(
  (select count(*) = 0 from public.audit_log
    where table_name = 'releases' and (coalesce(new_data, '{}') ? 'snapshot' or coalesce(old_data, '{}') ? 'snapshot')),
  'the large snapshot is not copied into the audit log');

-- ---------------------------------------------------------------------
-- 11. Access control and permanence
-- ---------------------------------------------------------------------

select test_helpers.act_as('00000000-0000-4000-8000-000000000001', 'aal1');
select test_helpers.expect_error($$select public.create_release('No MFA')$$, 'the admin without MFA cannot create a release');
select test_helpers.expect_error($$select public.preview_release_changes()$$, 'the admin without MFA cannot preview changes');
select test_helpers.expect((select count(*) = 0 from public.releases), 'the admin without MFA sees no releases');

select test_helpers.act_as('00000000-0000-4000-8000-000000000002', 'aal2');
select test_helpers.expect_error($$select public.create_rollback_release('Outsider')$$, 'a non-admin cannot roll back');
select test_helpers.expect_error(
  format('select public.release_snapshot_text(%s)', test_helpers.release_id('Baseline')), 'a non-admin cannot download a snapshot');
select test_helpers.expect((select count(*) = 0 from public.releases), 'a non-admin sees no releases');

select test_helpers.act_as_anon();
select test_helpers.expect_error($$select public.create_release('Anonymous')$$, 'an anonymous caller cannot create a release');
select test_helpers.expect_error($$select * from public.releases$$, 'an anonymous caller cannot read releases');

select test_helpers.act_as_owner();
select test_helpers.expect_error($$delete from public.releases where summary = 'Release C'$$, 'release history cannot be deleted');
select test_helpers.expect_error($$update public.release_items set diff = '{}'$$, 'release items cannot be edited');
select test_helpers.expect_error(
  $$update public.releases set snapshot = '{}' where summary = 'Release B'$$, 'a published snapshot cannot be rewritten');

select 'ALL ADMIN FOUNDATION TESTS PASSED' as result;

rollback;
