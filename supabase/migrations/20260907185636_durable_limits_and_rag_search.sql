create table if not exists private.request_rate_limits (
  scope text not null,
  key_hash text not null,
  request_count integer not null check (request_count > 0),
  reset_at timestamptz not null,
  primary key (scope, key_hash)
);

alter table private.request_rate_limits enable row level security;

revoke all on table private.request_rate_limits from public, anon, authenticated;
grant select, insert, update, delete
  on table private.request_rate_limits
  to service_role;

create or replace function public.consume_rate_limit(
  rate_scope text,
  rate_key_hash text,
  rate_limit integer,
  rate_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  current_count integer;
  current_reset timestamptz;
  current_time timestamptz := clock_timestamp();
begin
  if length(rate_scope) not between 1 and 80
    or length(rate_key_hash) <> 64
    or rate_limit not between 1 and 10000
    or rate_window_seconds not between 1 and 86400
  then
    raise exception 'invalid rate-limit parameters';
  end if;

  insert into private.request_rate_limits as bucket (
    scope,
    key_hash,
    request_count,
    reset_at
  )
  values (
    rate_scope,
    rate_key_hash,
    1,
    current_time + make_interval(secs => rate_window_seconds)
  )
  on conflict (scope, key_hash) do update
  set request_count = case
        when bucket.reset_at <= current_time then 1
        else bucket.request_count + 1
      end,
      reset_at = case
        when bucket.reset_at <= current_time
          then current_time + make_interval(secs => rate_window_seconds)
        else bucket.reset_at
      end
  returning request_count, reset_at
  into current_count, current_reset;

  if random() < 0.01 then
    delete from private.request_rate_limits
    where reset_at < current_time - interval '1 day';
  end if;

  return query
  select
    current_count <= rate_limit,
    greatest(0, ceil(extract(epoch from current_reset - current_time)))::integer;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;

create index if not exists chunks_embedding_hnsw_idx
  on public.chunks
  using hnsw (embedding extensions.vector_cosine_ops);

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
    where query_values.tsq <> ''::tsquery
      and to_tsvector('simple', chunk.content) @@ query_values.tsq
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
