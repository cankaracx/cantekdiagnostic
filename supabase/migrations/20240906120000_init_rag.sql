-- Cantek diagnostics RAG schema
create extension if not exists vector;
create extension if not exists pg_trgm;

do $$ begin
  create type public.visibility_level as enum ('repair', 'internal');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  file_path text,
  language text not null default 'en',
  equipment text,
  refrigerant text,
  visibility public.visibility_level not null default 'repair',
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  page int,
  heading text,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists chunks_document_id_idx on public.chunks (document_id);
create index if not exists chunks_fts_idx on public.chunks using gin (to_tsvector('simple', content));
create index if not exists chunks_trgm_idx on public.chunks using gin (content gin_trgm_ops);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  locale text,
  mode text not null default 'public',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  cited_chunk_ids uuid[],
  created_at timestamptz not null default now()
);

create table if not exists public.handoffs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  technician_email text,
  model_serial text,
  notes text,
  transcript jsonb,
  cited_chunk_ids uuid[],
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.handoffs enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('technician', 'admin');
$$;

drop policy if exists documents_select_repair on public.documents;
create policy documents_select_repair
  on public.documents for select
  to anon, authenticated
  using (visibility = 'repair' or public.is_staff());

drop policy if exists documents_write_staff on public.documents;
create policy documents_write_staff
  on public.documents for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists chunks_select on public.chunks;
create policy chunks_select
  on public.chunks for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = chunks.document_id
        and (d.visibility = 'repair' or public.is_staff())
    )
  );

drop policy if exists chunks_write_staff on public.chunks;
create policy chunks_write_staff
  on public.chunks for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists conversations_staff on public.conversations;
create policy conversations_staff
  on public.conversations for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists messages_staff on public.messages;
create policy messages_staff
  on public.messages for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists handoffs_staff on public.handoffs;
create policy handoffs_staff
  on public.handoffs for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

insert into storage.buckets (id, name, public)
values ('manuals', 'manuals', false)
on conflict (id) do nothing;
