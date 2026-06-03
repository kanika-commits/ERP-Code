drop policy if exists "vendors_select_authenticated" on public.vendors;
create policy "vendors_select_authenticated"
on public.vendors
for select
to authenticated
using (true);

drop policy if exists "vendors_insert_admin_only" on public.vendors;
create policy "vendors_insert_admin_only"
on public.vendors
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);
