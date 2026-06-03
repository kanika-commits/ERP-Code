drop policy if exists "sites_select_authenticated" on public.sites;
create policy "sites_select_authenticated"
on public.sites
for select
to authenticated
using (true);

drop policy if exists "sites_insert_admin_only" on public.sites;
create policy "sites_insert_admin_only"
on public.sites
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "projects_select_authenticated" on public.projects;
create policy "projects_select_authenticated"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "projects_insert_admin_only" on public.projects;
create policy "projects_insert_admin_only"
on public.projects
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);
