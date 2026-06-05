-- Template for adding an ERP profile and role after creating the Auth user in Supabase.
-- Replace the values in the variables before running.

do $$
declare
  target_email text := 'user@example.com';
  target_full_name text := 'User Name';
  target_role_code text := 'viewer';
  target_scope_type text := 'global';
  target_scope_id uuid := '00000000-0000-0000-0000-000000000000';
  target_company_code text := 'mrc';
  target_vendor_id uuid := null;
  target_company_id uuid;
  target_user_id uuid;
  target_role_id uuid;
begin
  select id
    into target_user_id
  from auth.users
  where email = target_email
  limit 1;

  if target_user_id is null then
    raise exception 'No Supabase Auth user found for email: %', target_email;
  end if;

  select id
    into target_role_id
  from public.roles
  where code = target_role_code
  limit 1;

  if target_role_id is null then
    raise exception 'Role not found: %', target_role_code;
  end if;

  select id
    into target_company_id
  from public.companies
  where company_code = target_company_code
  limit 1;

  insert into public.profiles (id, company_id, full_name, email, status, vendor_id)
  values (target_user_id, target_company_id, target_full_name, target_email, 'active', target_vendor_id)
  on conflict (id) do update
    set company_id = excluded.company_id,
        full_name = excluded.full_name,
        email = excluded.email,
        status = 'active',
        vendor_id = excluded.vendor_id,
        updated_at = now();

  insert into public.user_roles (user_id, role_id, scope_type, scope_id)
  values (target_user_id, target_role_id, target_scope_type, target_scope_id)
  on conflict (user_id, role_id, scope_type, scope_id) do nothing;
end $$;
