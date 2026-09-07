create or replace function public.get_app_secrets(secret_names text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(name, value), '{}'::jsonb)
  from private.app_secrets
  where name = any(secret_names);
$$;

create or replace function public.delete_app_secret(secret_name text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  delete from private.app_secrets
  where name = secret_name;
$$;

revoke all on function public.get_app_secrets(text[]) from public, anon, authenticated;
revoke all on function public.delete_app_secret(text) from public, anon, authenticated;

grant execute on function public.get_app_secrets(text[]) to service_role;
grant execute on function public.delete_app_secret(text) to service_role;
