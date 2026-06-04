drop policy if exists "ra_bills_select_authenticated" on public.ra_bills;
create policy "ra_bills_select_authenticated"
on public.ra_bills
for select
to authenticated
using (true);

drop policy if exists "ra_bills_insert_admin_only" on public.ra_bills;
create policy "ra_bills_insert_admin_only"
on public.ra_bills
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "invoices_select_authenticated" on public.invoices;
create policy "invoices_select_authenticated"
on public.invoices
for select
to authenticated
using (true);

drop policy if exists "invoices_insert_admin_only" on public.invoices;
create policy "invoices_insert_admin_only"
on public.invoices
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "payments_select_authenticated" on public.payments;
create policy "payments_select_authenticated"
on public.payments
for select
to authenticated
using (true);

drop policy if exists "payments_insert_admin_only" on public.payments;
create policy "payments_insert_admin_only"
on public.payments
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "debit_notes_select_authenticated" on public.debit_notes;
create policy "debit_notes_select_authenticated"
on public.debit_notes
for select
to authenticated
using (true);

drop policy if exists "debit_notes_insert_admin_only" on public.debit_notes;
create policy "debit_notes_insert_admin_only"
on public.debit_notes
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

