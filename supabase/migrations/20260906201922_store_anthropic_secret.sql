create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null check (length(value) between 1 and 4096),
  updated_at timestamptz not null default now()
);

revoke all on table private.app_secrets from public, anon, authenticated;
grant select, insert, update, delete on table private.app_secrets to service_role;

-- PostgREST does not expose the private schema. These security-invoker RPCs
-- let only the service role read and write the table without exposing rows to
-- anonymous or authenticated browser clients.
create or replace function public.get_app_secret(secret_name text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select value
  from private.app_secrets
  where name = secret_name;
$$;

create or replace function public.set_app_secret(
  secret_name text,
  secret_value text
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into private.app_secrets (name, value, updated_at)
  values (secret_name, secret_value, now())
  on conflict (name) do update
  set value = excluded.value,
      updated_at = excluded.updated_at;
$$;

revoke all on function public.get_app_secret(text) from public, anon, authenticated;
revoke all on function public.set_app_secret(text, text) from public, anon, authenticated;

grant execute on function public.get_app_secret(text) to service_role;
grant execute on function public.set_app_secret(text, text) to service_role;
