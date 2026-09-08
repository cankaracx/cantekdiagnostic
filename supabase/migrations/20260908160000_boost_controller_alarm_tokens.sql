-- Boost exact controller alarm tokens (HP, LP, E0, HI, CHT, …) so a plant
-- operator typing the code from the display is not buried by vector similarity.
-- Signature stays compatible with existing search_manual_chunks callers.

create or replace function public.search_manual_chunks(
  query_embedding extensions.vector(1536),
  query_text text,
  include_internal boolean default false,
  match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page integer,
  heading text,
  token_count integer,
  visibility public.visibility_level,
  document_title text,
  equipment text,
  refrigerant text,
  language text,
  score double precision
)
language sql
stable
security invoker
set search_path = 'public', 'extensions'
as $$
  with query_values as (
    select plainto_tsquery('simple', left(coalesce(query_text, ''), 1000)) as tsq
  ),
  alarm_tokens as (
    select distinct upper(match[1]) as token
    from regexp_matches(
      left(coalesce(query_text, ''), 1000),
      '(?:^|[^[:alnum:]])([EAHLF][A-Za-z]?[0-9]{1,3}|HP|LP|HPS|LPS|HT|LT|NH3|HI|LO|CHT|DEF)(?:[^[:alnum:]]|$)',
      'gi'
    ) as match
  ),
  vector_candidates as (
    select chunk.id
    from public.chunks as chunk
    join public.documents as document on document.id = chunk.document_id
    where query_embedding is not null
      and chunk.embedding is not null
      and (
        document.visibility = 'repair'
        or (include_internal and (select public.is_staff()))
      )
    order by chunk.embedding operator(extensions.<=>) query_embedding
    limit least(greatest(match_count, 1), 20) * 5
  ),
  keyword_candidates as (
    select chunk.id
    from public.chunks as chunk
    join public.documents as document on document.id = chunk.document_id
    cross join query_values
    where (
        (
          query_values.tsq <> ''::tsquery
          and to_tsvector('simple', chunk.content) @@ query_values.tsq
        )
        or exists (
          select 1
          from alarm_tokens
          where chunk.content ~* (
            '(^|[^[:alnum:]])' || alarm_tokens.token || '([^[:alnum:]]|$)'
          )
        )
      )
      and (
        document.visibility = 'repair'
        or (include_internal and (select public.is_staff()))
      )
    order by ts_rank_cd(
      to_tsvector('simple', chunk.content),
      query_values.tsq
    ) desc
    limit least(greatest(match_count, 1), 20) * 5
  ),
  candidate_ids as (
    select id from vector_candidates
    union
    select id from keyword_candidates
  )
  select
    chunk.id,
    chunk.document_id,
    chunk.content,
    chunk.page,
    chunk.heading,
    coalesce(chunk.token_count, 0),
    document.visibility,
    document.title,
    document.equipment,
    document.refrigerant,
    document.language,
    (
      case
        when query_embedding is null or chunk.embedding is null then 0
        else greatest(
          0,
          1 - (chunk.embedding operator(extensions.<=>) query_embedding)
        ) * 2.2
      end
      + ts_rank_cd(
          to_tsvector(
            'simple',
            concat_ws(
              ' ',
              document.title,
              document.equipment,
              document.refrigerant,
              chunk.heading,
              chunk.content
            )
          ),
          query_values.tsq
        ) * 3
      + extensions.similarity(
          left(coalesce(query_text, ''), 1000),
          left(chunk.content, 4000)
        ) * 0.5
      + coalesce(
          (
            select sum(4.0)
            from alarm_tokens
            where concat_ws(
              ' ',
              document.title,
              document.equipment,
              chunk.heading,
              chunk.content
            ) ~* (
              '(^|[^[:alnum:]])' || alarm_tokens.token || '([^[:alnum:]]|$)'
            )
          ),
          0
        )
    )::double precision as score
  from candidate_ids
  join public.chunks as chunk on chunk.id = candidate_ids.id
  join public.documents as document on document.id = chunk.document_id
  cross join query_values
  order by score desc
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function public.search_manual_chunks(
  extensions.vector,
  text,
  boolean,
  integer
) from public;

grant execute on function public.search_manual_chunks(
  extensions.vector,
  text,
  boolean,
  integer
) to anon, authenticated, service_role;
