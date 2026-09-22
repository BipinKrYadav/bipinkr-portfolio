-- =====================================================================
-- Portfolio admin · Phase 5A · draft editing
--
-- Draft saves are atomic: optimistic concurrency, token preservation,
-- revision creation and the existing audit triggers all happen in one
-- transaction. Publication fields remain pipeline-only.
-- =====================================================================

-- Every protected token together with the structural path of the field that
-- holds it: jsonb [path, token], where path is a jsonb array of object keys
-- (strings) and array indices (numbers) from the document root. A string's
-- tokens sit at the string's own path; a $metricValue or $pair token sits at
-- the object that carries it. Paths are built as jsonb, never by joining
-- text, so no key can be spelled to forge another path. Compared as a sorted
-- multiset: token order within one field is free, but a token may not move to
-- another field, which would leave document_metric_refs.field_path stale.
--
-- The parameters are p_*, and every set-returning call names its output
-- columns, so no identifier can be read as both a parameter and a column.
create or replace function private.collect_document_tokens(p_value jsonb, p_path jsonb default '[]'::jsonb)
returns jsonb[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  tokens jsonb[] := array[]::jsonb[];
  item jsonb;
  item_key text;
  item_index bigint;
  pair jsonb;
  token text;
  text_value text;
begin
  if p_value is null then
    return tokens;
  end if;

  case jsonb_typeof(p_value)
    when 'string' then
      text_value := p_value #>> '{}';

      if position('{{' in text_value) > 0 or position('}}' in text_value) > 0 then
        for token in
          select (match)[1]
          from regexp_matches(text_value, '(\{\{[^{}]*\}\})', 'g') as match
        loop
          tokens := array_append(tokens, jsonb_build_array(p_path, token));
        end loop;

        if regexp_replace(text_value, '\{\{[^{}]*\}\}', '', 'g') ~ '(\{\{|\}\})' then
          raise exception 'The document contains a malformed token';
        end if;
      end if;

    when 'array' then
      for item, item_index in
        select element.item, element.position - 1
        from jsonb_array_elements(p_value) with ordinality as element(item, position)
      loop
        tokens := tokens || private.collect_document_tokens(item, p_path || jsonb_build_array(item_index));
      end loop;

    when 'object' then
      if jsonb_typeof(p_value -> '$metricValue') = 'string' then
        tokens := array_append(tokens, jsonb_build_array(p_path, '$metricValue:' || (p_value ->> '$metricValue')));
      end if;

      pair := p_value -> '$pair';
      if jsonb_typeof(pair) = 'object'
         and jsonb_typeof(pair -> 'first') = 'string'
         and jsonb_typeof(pair -> 'second') = 'string' then
        tokens := array_append(tokens, jsonb_build_array(p_path, '$pair:' || (pair ->> 'first') || ':' || (pair ->> 'second')));
      end if;

      for item_key, item in select entry.key, entry.item from jsonb_each(p_value) as entry(key, item)
      loop
        tokens := tokens || private.collect_document_tokens(item, p_path || jsonb_build_array(item_key));
      end loop;

    else
      null;
  end case;

  return tokens;
end;
$$;

revoke all on function private.collect_document_tokens(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.save_document_draft(
  p_document_id uuid,
  p_expected_updated_at timestamptz,
  p_draft jsonb,
  p_change_summary text
)
returns public.documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_document public.documents;
  updated_document public.documents;
  expected_tokens jsonb[];
  draft_tokens jsonb[];
begin
  if not private.is_admin() then
    raise exception 'MFA-verified admin access is required';
  end if;

  if p_draft is null or jsonb_typeof(p_draft) <> 'object' then
    raise exception 'Document draft must be a JSON object';
  end if;

  if p_change_summary is null or btrim(p_change_summary) = '' then
    raise exception 'A change summary is required';
  end if;

  select *
    into current_document
    from public.documents
   where id = p_document_id
   for update;

  if current_document.id is null then
    raise exception 'Document not found';
  end if;

  if current_document.updated_at is distinct from p_expected_updated_at then
    raise exception 'This document changed after you opened it. Reload before saving.';
  end if;

  if current_document.draft = p_draft then
    raise exception 'There are no changes to save';
  end if;

  -- (path, token) pairs as sorted multisets: same tokens in the same fields, any order within a field.
  select coalesce(array_agg(token order by token), array[]::jsonb[])
    into expected_tokens
    from unnest(private.collect_document_tokens(current_document.draft)) as token;

  select coalesce(array_agg(token order by token), array[]::jsonb[])
    into draft_tokens
    from unnest(private.collect_document_tokens(p_draft)) as token;

  if expected_tokens <> draft_tokens then
    raise exception 'Document tokens are locked in Phase 5A. Metric, evidence and client-label references cannot be changed or moved to another field here.';
  end if;

  update public.documents
     set draft = p_draft
   where id = p_document_id
     and updated_at = p_expected_updated_at
   returning * into updated_document;

  if updated_document.id is null then
    raise exception 'This document changed after you opened it. Reload before saving.';
  end if;

  insert into public.document_revisions (
    document_id,
    content,
    schema_version,
    change_summary
  )
  values (
    updated_document.id,
    p_draft,
    updated_document.schema_version,
    btrim(p_change_summary)
  );

  return updated_document;
end;
$$;

revoke all on function public.save_document_draft(uuid, timestamptz, jsonb, text) from public, anon;
grant execute on function public.save_document_draft(uuid, timestamptz, jsonb, text) to authenticated;
