-- Run this once in Supabase SQL Editor after creating your first Auth user.
-- Replace the email below if your login email is different.

do $$
declare
  target_email text := 'kanika@mrcgroup.in';
  target_user_id uuid;
  super_admin_role_id uuid;
begin
  select id
    into target_user_id
  from auth.users
  where email = target_email
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for email: %', target_email;
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (target_user_id, 'Kanika Ranjan', target_email, 'active')
  on conflict (id) do update
    set email = excluded.email,
        status = 'active',
        updated_at = now();

  select id
    into super_admin_role_id
  from public.roles
  where code = 'super_admin'
  limit 1;

  if super_admin_role_id is null then
    raise exception 'Role super_admin was not found. Run the schema first.';
  end if;

  insert into public.user_roles (user_id, role_id, scope_type, scope_id)
  values (
    target_user_id,
    super_admin_role_id,
    'global',
    '00000000-0000-0000-0000-000000000000'
  )
  on conflict (user_id, role_id, scope_type, scope_id) do nothing;
end $$;

create or replace function public.current_user_has_role(role_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code = role_code
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "roles_select_authenticated" on public.roles;
create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

drop policy if exists "user_roles_select_own_or_admin" on public.user_roles;
create policy "user_roles_select_own_or_admin"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);
