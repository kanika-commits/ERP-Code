-- Patch older ERP databases so work order files can be linked to private storage.
-- Run this before executing scripts/upload-drive-files-to-supabase.mjs.

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  file_name text,
  storage_provider text not null default 'google_drive',
  url text,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.files
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists file_name text,
  add column if not exists storage_provider text not null default 'google_drive',
  add column if not exists url text,
  add column if not exists mime_type text,
  add column if not exists uploaded_by uuid references auth.users(id),
  add column if not exists created_at timestamptz not null default now();

update public.files
set
  entity_type = coalesce(entity_type, 'work_order'),
  file_name = coalesce(file_name, 'Imported file'),
  url = coalesce(url, '')
where entity_type is null
  or file_name is null
  or url is null;

alter table public.files
  alter column entity_type set not null,
  alter column entity_id set not null,
  alter column file_name set not null,
  alter column url set not null;

create index if not exists files_entity_idx
on public.files (entity_type, entity_id);

create unique index if not exists files_work_order_url_key
on public.files (entity_type, entity_id, url);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'files' and column_name = 'owner_type'
  ) then
    alter table public.files alter column owner_type drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'files' and column_name = 'owner_id'
  ) then
    alter table public.files alter column owner_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'files' and column_name = 'bucket_name'
  ) then
    alter table public.files alter column bucket_name drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'files' and column_name = 'storage_path'
  ) then
    alter table public.files alter column storage_path drop not null;
  end if;
end $$;
