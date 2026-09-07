create policy request_rate_limits_service
  on private.request_rate_limits for all
  to service_role
  using (true)
  with check (true);

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
  v_count integer;
  v_reset timestamptz;
  v_now timestamptz := clock_timestamp();
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
    v_now + make_interval(secs => rate_window_seconds)
  )
  on conflict (scope, key_hash) do update
  set request_count = case
        when bucket.reset_at <= v_now then 1
        else bucket.request_count + 1
      end,
      reset_at = case
        when bucket.reset_at <= v_now
          then v_now + make_interval(secs => rate_window_seconds)
        else bucket.reset_at
      end
  returning request_count, reset_at
  into v_count, v_reset;

  if random() < 0.01 then
    delete from private.request_rate_limits
    where reset_at < v_now - interval '1 day';
  end if;

  return query
  select
    v_count <= rate_limit,
    greatest(0, ceil(extract(epoch from v_reset - v_now)))::integer;
end;
$$;

drop policy if exists conversations_admin_all on public.conversations;
drop policy if exists conversations_technician_select on public.conversations;
drop policy if exists conversations_technician_insert on public.conversations;

create policy conversations_select
  on public.conversations for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and created_by = (select auth.uid())
    )
  );

create policy conversations_insert
  on public.conversations for insert
  to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and created_by = (select auth.uid())
    )
  );

create policy conversations_admin_update
  on public.conversations for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy conversations_admin_delete
  on public.conversations for delete
  to authenticated
  using ((select public.is_admin()));

drop policy if exists messages_admin_all on public.messages;
drop policy if exists messages_technician_select on public.messages;
drop policy if exists messages_technician_insert on public.messages;

create policy messages_select
  on public.messages for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
          and conversations.created_by = (select auth.uid())
      )
    )
  );

create policy messages_insert
  on public.messages for insert
  to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and exists (
        select 1
        from public.conversations
        where conversations.id = messages.conversation_id
          and conversations.created_by = (select auth.uid())
      )
    )
  );

create policy messages_admin_update
  on public.messages for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy messages_admin_delete
  on public.messages for delete
  to authenticated
  using ((select public.is_admin()));

drop policy if exists handoffs_admin_all on public.handoffs;
drop policy if exists handoffs_technician_select on public.handoffs;
drop policy if exists handoffs_technician_insert on public.handoffs;

create policy handoffs_select
  on public.handoffs for select
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and created_by = (select auth.uid())
    )
  );

create policy handoffs_insert
  on public.handoffs for insert
  to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.is_staff())
      and created_by = (select auth.uid())
    )
  );

create policy handoffs_admin_update
  on public.handoffs for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy handoffs_admin_delete
  on public.handoffs for delete
  to authenticated
  using ((select public.is_admin()));
