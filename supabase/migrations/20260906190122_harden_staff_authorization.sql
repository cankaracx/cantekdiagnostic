create schema if not exists extensions;

alter extension vector set schema extensions;
alter extension pg_trgm set schema extensions;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('technician', 'admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

drop policy if exists documents_write_staff on public.documents;
drop policy if exists documents_insert_admin on public.documents;
create policy documents_insert_admin
  on public.documents for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists documents_update_admin on public.documents;
create policy documents_update_admin
  on public.documents for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists documents_delete_admin on public.documents;
create policy documents_delete_admin
  on public.documents for delete
  to authenticated
  using ((select public.is_admin()));

drop policy if exists chunks_write_staff on public.chunks;
drop policy if exists chunks_insert_admin on public.chunks;
create policy chunks_insert_admin
  on public.chunks for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists chunks_update_admin on public.chunks;
create policy chunks_update_admin
  on public.chunks for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists chunks_delete_admin on public.chunks;
create policy chunks_delete_admin
  on public.chunks for delete
  to authenticated
  using ((select public.is_admin()));

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id);
