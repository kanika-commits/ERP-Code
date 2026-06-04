-- Private storage bucket for work order documents.
-- Run this once before uploading files into Supabase Storage.

insert into storage.buckets (id, name, public)
values ('work-order-files', 'work-order-files', false)
on conflict (id) do update set public = excluded.public;

alter table public.files enable row level security;

drop policy if exists "files_select_authenticated" on public.files;
create policy "files_select_authenticated"
on public.files
for select
to authenticated
using (true);

drop policy if exists "files_insert_admin_only" on public.files;
create policy "files_insert_admin_only"
on public.files
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "work_order_files_select_authenticated" on storage.objects;
create policy "work_order_files_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'work-order-files');

drop policy if exists "work_order_files_insert_admin_only" on storage.objects;
create policy "work_order_files_insert_admin_only"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'work-order-files'
  and (
    public.current_user_has_role('super_admin')
    or public.current_user_has_role('admin')
  )
);
