alter table public.conversations
  add column if not exists created_by uuid
  references auth.users(id) on delete set null
  default auth.uid();

alter table public.handoffs
  add column if not exists created_by uuid
  references auth.users(id) on delete set null
  default auth.uid();

update public.handoffs as handoff
set created_by = app_user.id
from auth.users as app_user
where handoff.created_by is null
  and handoff.technician_email is not null
  and lower(app_user.email) = lower(handoff.technician_email);

create index if not exists conversations_created_by_idx
  on public.conversations (created_by);

create index if not exists handoffs_created_by_idx
  on public.handoffs (created_by);

drop policy if exists conversations_staff on public.conversations;
drop policy if exists conversations_admin_all on public.conversations;
create policy conversations_admin_all
  on public.conversations for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists conversations_technician_select on public.conversations;
create policy conversations_technician_select
  on public.conversations for select
  to authenticated
  using (
    (select public.is_staff())
    and created_by = (select auth.uid())
  );

drop policy if exists conversations_technician_insert on public.conversations;
create policy conversations_technician_insert
  on public.conversations for insert
  to authenticated
  with check (
    (select public.is_staff())
    and created_by = (select auth.uid())
  );

drop policy if exists messages_staff on public.messages;
drop policy if exists messages_admin_all on public.messages;
create policy messages_admin_all
  on public.messages for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists messages_technician_select on public.messages;
create policy messages_technician_select
  on public.messages for select
  to authenticated
  using (
    (select public.is_staff())
    and exists (
      select 1
      from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.created_by = (select auth.uid())
    )
  );

drop policy if exists messages_technician_insert on public.messages;
create policy messages_technician_insert
  on public.messages for insert
  to authenticated
  with check (
    (select public.is_staff())
    and exists (
      select 1
      from public.conversations
      where conversations.id = messages.conversation_id
        and conversations.created_by = (select auth.uid())
    )
  );

drop policy if exists handoffs_staff on public.handoffs;
drop policy if exists handoffs_admin_all on public.handoffs;
create policy handoffs_admin_all
  on public.handoffs for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists handoffs_technician_select on public.handoffs;
create policy handoffs_technician_select
  on public.handoffs for select
  to authenticated
  using (
    (select public.is_staff())
    and created_by = (select auth.uid())
  );

drop policy if exists handoffs_technician_insert on public.handoffs;
create policy handoffs_technician_insert
  on public.handoffs for insert
  to authenticated
  with check (
    (select public.is_staff())
    and created_by = (select auth.uid())
  );
