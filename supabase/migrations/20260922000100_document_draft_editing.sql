-- =====================================================================
-- Portfolio admin · Phase 5A · draft editing
--
-- Draft saves are atomic: optimistic concurrency, token preservation,
-- revision creation and the existing audit triggers all happen in one
-- transaction. Publication fields remain pipeline-only.
-- =====================================================================

create or replace function private.collect_document_tokens(value jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  tokens text[] := array[]::text[];
  item jsonb;
  pair jsonb;
  token text;
  text_value text;
begin
  if value is null then
    return tokens;
  end if;

  case jsonb_typeof(value)
    when 'string' then
      text_value := value #>> '{}';

      if position('{{' in text_value) > 0 or position('}}' in text_value) > 0 then
        for token in
          select (match)[1]
          from regexp_matches(text_value, '(\{\{[^{}]*\}\})', 'g') as match
        loop
          tokens := array_append(tokens, token);
        end loop;

        if regexp_replace(text_value, '\{\{[^{}]*\}\}', '', 'g') ~ '(\{\{|\}\})' then
          raise exception 'The document contains a malformed token';
        end if;
      end if;

    when 'array' then
      for item in select value from jsonb_array_elements(value)
      loop
        tokens := tokens || private.collect_document_tokens(item);
      end loop;

    when 'object' then
      if jsonb_typeof(value -> '$metricValue') = 'string' then
        tokens := array_append(tokens, '$metricValue:' || (value ->> '$metricValue'));
      end if;

      pair := value -> '$pair';
      if jsonb_typeof(pair) = 'object'
         and jsonb_typeof(pair -> 'first') = 'string'
         and jsonb_typeof(pair -> 'second') = 'string' then
        tokens := array_append(tokens, '$pair:' || (pair ->> 'first') || ':' || (pair ->> 'second'));
      end if;

      for item in select value from jsonb_each(value)
      loop
        tokens := tokens || private.collect_document_tokens(item);
      end loop;

    else
      null;
  end case;

  return tokens;
end;
$$;

revoke all on function private.collect_document_tokens(jsonb) from public, anon, authenticated;

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
  expected_tokens text[];
  draft_tokens text[];
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

  select coalesce(array_agg(token order by token), array[]::text[])
    into expected_tokens
    from unnest(private.collect_document_tokens(current_document.draft)) as token;

  select coalesce(array_agg(token order by token), array[]::text[])
    into draft_tokens
    from unnest(private.collect_document_tokens(p_draft)) as token;

  if expected_tokens <> draft_tokens then
    raise exception 'Document tokens are locked in Phase 5A. Metric, evidence and client-label references cannot be changed here.';
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
