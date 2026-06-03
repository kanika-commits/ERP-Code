drop policy if exists "work_orders_select_authenticated" on public.work_orders;
create policy "work_orders_select_authenticated"
on public.work_orders
for select
to authenticated
using (true);

drop policy if exists "work_orders_insert_admin_only" on public.work_orders;
create policy "work_orders_insert_admin_only"
on public.work_orders
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

