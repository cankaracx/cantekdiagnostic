create table if not exists private.request_concurrency_leases (
  scope text not null,
  lease_id uuid not null,
  expires_at timestamptz not null,
  primary key (scope, lease_id)
);

create index if not exists request_concurrency_leases_expiry_idx
  on private.request_concurrency_leases (scope, expires_at);

alter table private.request_concurrency_leases enable row level security;

revoke all on table private.request_concurrency_leases
  from public, anon, authenticated;
grant select, insert, update, delete
  on table private.request_concurrency_leases
  to service_role;

create policy request_concurrency_leases_service
  on private.request_concurrency_leases for all
  to service_role
  using (true)
  with check (true);

create or replace function public.acquire_concurrency_lease(
  lease_scope text,
  requested_lease_id uuid,
  max_concurrency integer,
  lease_seconds integer
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  active_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if length(lease_scope) not between 1 and 80
    or max_concurrency not between 1 and 200
    or lease_seconds not between 5 and 300
  then
    raise exception 'invalid concurrency-lease parameters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lease_scope, 0)
  );

  delete from private.request_concurrency_leases
  where scope = lease_scope
    and expires_at <= v_now;

  select count(*)
  into active_count
  from private.request_concurrency_leases
  where scope = lease_scope;

  if active_count >= max_concurrency then
    return false;
  end if;

  insert into private.request_concurrency_leases (
    scope,
    lease_id,
    expires_at
  )
  values (
    lease_scope,
    requested_lease_id,
    v_now + make_interval(secs => lease_seconds)
  );

  return true;
end;
$$;

create or replace function public.release_concurrency_lease(
  lease_scope text,
  requested_lease_id uuid
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  delete from private.request_concurrency_leases
  where scope = lease_scope
    and lease_id = requested_lease_id;
$$;

revoke all on function public.acquire_concurrency_lease(
  text,
  uuid,
  integer,
  integer
) from public, anon, authenticated;

revoke all on function public.release_concurrency_lease(text, uuid)
  from public, anon, authenticated;

grant execute on function public.acquire_concurrency_lease(
  text,
  uuid,
  integer,
  integer
) to service_role;

grant execute on function public.release_concurrency_lease(text, uuid)
  to service_role;
