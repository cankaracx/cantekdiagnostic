create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
    in ('technician', 'admin', 'super_admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
    in ('admin', 'super_admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_super_admin() from public;

grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to authenticated, service_role;
