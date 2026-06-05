-- Master Setup and Access Control foundation.
-- Run after supabase/schema.sql. This patch is additive and keeps existing ERP data intact.

create extension if not exists pgcrypto;

alter table public.roles add column if not exists description text;
alter table public.roles add column if not exists is_system boolean not null default false;
alter table public.roles add column if not exists created_by uuid references auth.users(id);
alter table public.roles add column if not exists created_at timestamptz not null default now();
alter table public.roles add column if not exists updated_at timestamptz not null default now();

update public.roles
set is_system = true
where code in (
  'platform_owner',
  'company_owner',
  'super_admin',
  'admin',
  'module_admin',
  'manager',
  'project_manager',
  'site_engineer',
  'accounts',
  'approver',
  'staff',
  'vendor',
  'viewer'
);

alter table public.sites add column if not exists company_id uuid references public.companies(id);
alter table public.sites add column if not exists address text;
alter table public.sites add column if not exists created_by uuid references auth.users(id);

update public.sites
set company_id = (select id from public.companies where company_code = 'mrc')
where company_id is null;

alter table public.projects add column if not exists company_id uuid references public.companies(id);
update public.projects
set company_id = coalesce(
  company_id,
  (select sites.company_id from public.sites where sites.id = projects.site_id),
  (select id from public.companies where company_code = 'mrc')
)
where company_id is null;

alter table public.vendors add column if not exists company_id uuid references public.companies(id);
alter table public.vendors add column if not exists vendor_type text;
alter table public.vendors add column if not exists address text;
alter table public.vendors add column if not exists gst_status text not null default 'pending';
alter table public.vendors add column if not exists pan_status text not null default 'pending';
alter table public.vendors add column if not exists bank_status text not null default 'pending';
alter table public.vendors add column if not exists compliance_notes text;
alter table public.vendors add column if not exists created_by uuid references auth.users(id);

update public.vendors
set company_id = (select id from public.companies where company_code = 'mrc')
where company_id is null;

alter table public.work_orders add column if not exists company_id uuid references public.companies(id);
update public.work_orders
set company_id = coalesce(
  company_id,
  (select sites.company_id from public.sites where sites.id = work_orders.site_id),
  (select id from public.companies where company_code = 'mrc')
)
where company_id is null;

create table if not exists public.user_company_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create table if not exists public.user_site_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, site_id)
);

create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  document_type text not null,
  file_id uuid references public.files(id) on delete set null,
  status text not null default 'pending',
  expiry_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_controls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  module_code text not null,
  site_id uuid references public.sites(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  action text not null check (action in ('view', 'add', 'edit', 'delete', 'upload', 'approve', 'reject')),
  enabled boolean not null default true,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, module_code, site_id, role_id, action)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module_code text not null,
  resource text not null,
  action text not null,
  name text not null,
  description text,
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

alter table public.role_permissions add column if not exists allowed boolean;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'role_permissions'
      and column_name = 'effect'
  ) then
    execute 'update public.role_permissions set allowed = case when effect = ''deny'' then false else true end where allowed is null';
  end if;
end $$;
update public.role_permissions set allowed = true where allowed is null;
alter table public.role_permissions alter column allowed set default true;
alter table public.role_permissions alter column allowed set not null;
alter table public.role_permissions drop column if exists effect;

create table if not exists public.user_access_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  module_code text,
  scope_type text not null default 'company' check (scope_type in ('global', 'company', 'site', 'project', 'vendor')),
  scope_id uuid,
  status text not null default 'active',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  module_code text,
  scope_type text not null default 'company' check (scope_type in ('global', 'company', 'site', 'project', 'vendor')),
  scope_id uuid,
  allowed boolean not null default true,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_id, company_id, module_code, scope_type, scope_id)
);

alter table public.user_permission_overrides add column if not exists allowed boolean;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_permission_overrides'
      and column_name = 'effect'
  ) then
    execute 'update public.user_permission_overrides set allowed = case when effect = ''deny'' then false else true end where allowed is null';
  end if;
end $$;
update public.user_permission_overrides set allowed = true where allowed is null;
alter table public.user_permission_overrides alter column allowed set default true;
alter table public.user_permission_overrides alter column allowed set not null;
alter table public.user_permission_overrides drop column if exists effect;

insert into public.permissions (code, module_code, resource, action, name, is_sensitive)
values
  ('companies.view', 'companies', 'Companies', 'view', 'View Companies', false),
  ('companies.add', 'companies', 'Companies', 'add', 'Add Companies', true),
  ('companies.edit', 'companies', 'Companies', 'edit', 'Edit Companies', true),
  ('companies.delete', 'companies', 'Companies', 'delete', 'Delete Companies', true),
  ('sites.view', 'sites', 'Sites', 'view', 'View Sites', false),
  ('sites.add', 'sites', 'Sites', 'add', 'Add Sites', false),
  ('sites.edit', 'sites', 'Sites', 'edit', 'Edit Sites', false),
  ('sites.delete', 'sites', 'Sites', 'delete', 'Delete Sites', true),
  ('vendors.view', 'vendors', 'Vendors', 'view', 'View Vendors', false),
  ('vendors.add', 'vendors', 'Vendors', 'add', 'Add Vendors', false),
  ('vendors.edit', 'vendors', 'Vendors', 'edit', 'Edit Vendors', false),
  ('vendors.delete', 'vendors', 'Vendors', 'delete', 'Delete Vendors', true),
  ('vendors.upload', 'vendors', 'Vendors', 'upload', 'Upload Vendor Documents', false),
  ('vendors.approve', 'vendors', 'Vendors', 'approve', 'Approve Vendors', true),
  ('vendors.reject', 'vendors', 'Vendors', 'reject', 'Reject Vendors', true),
  ('work_orders.add', 'work_orders', 'Work Orders', 'add', 'Add Work Orders', false),
  ('work_orders.reject', 'work_orders', 'Work Orders', 'reject', 'Reject Work Orders', true),
  ('ra_bills.add', 'ra_bills', 'RA Bills', 'add', 'Add RA Bills', false),
  ('ra_bills.reject', 'ra_bills', 'RA Bills', 'reject', 'Reject RA Bills', true),
  ('invoices.add', 'invoices', 'Invoices', 'add', 'Add Invoices', false),
  ('invoices.reject', 'invoices', 'Invoices', 'reject', 'Reject Invoices', true),
  ('payments.add', 'payments', 'Payments', 'add', 'Add Payments', false),
  ('payments.reject', 'payments', 'Payments', 'reject', 'Reject Payments', true),
  ('debit_notes.add', 'debit_notes', 'Debit Notes', 'add', 'Add Debit Notes', false),
  ('debit_notes.reject', 'debit_notes', 'Debit Notes', 'reject', 'Reject Debit Notes', true),
  ('files.reject', 'files', 'Files', 'reject', 'Reject Files', true),
  ('reports.view', 'reports', 'Reports', 'view', 'View Reports', false),
  ('reports.add', 'reports', 'Reports', 'add', 'Add Reports', true),
  ('reports.edit', 'reports', 'Reports', 'edit', 'Edit Reports', true),
  ('reports.delete', 'reports', 'Reports', 'delete', 'Delete Reports', true),
  ('reports.upload', 'reports', 'Reports', 'upload', 'Upload Report Files', true),
  ('reports.approve', 'reports', 'Reports', 'approve', 'Approve Reports', true),
  ('reports.reject', 'reports', 'Reports', 'reject', 'Reject Reports', true)
on conflict (code) do update
set module_code = excluded.module_code,
    resource = excluded.resource,
    action = excluded.action,
    name = excluded.name,
    is_sensitive = excluded.is_sensitive,
    updated_at = now();

insert into public.permissions (code, module_code, resource, action, name, is_sensitive)
select resource_code || '.' || action_code,
       resource_code,
       resource_name,
       action_code,
       initcap(action_code) || ' ' || resource_name,
       action_code = 'delete'
from (
  values
    ('companies', 'Companies'),
    ('sites', 'Sites'),
    ('vendors', 'Vendors'),
    ('work_orders', 'Work Orders'),
    ('ra_bills', 'RA Bills'),
    ('invoices', 'Invoices'),
    ('payments', 'Payments'),
    ('debit_notes', 'Debit Notes'),
    ('files', 'Files'),
    ('reports', 'Reports')
) as resources(resource_code, resource_name)
cross join (
  values
    ('view'),
    ('add'),
    ('edit'),
    ('delete'),
    ('upload'),
    ('approve'),
    ('reject')
) as actions(action_code)
on conflict (code) do update
set module_code = excluded.module_code,
    resource = excluded.resource,
    action = excluded.action,
    name = excluded.name,
    is_sensitive = excluded.is_sensitive,
    updated_at = now();

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
cross join public.permissions p
where r.code in ('platform_owner', 'super_admin')
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

-- Backfill user company assignment from profiles.
insert into public.user_company_assignments (user_id, company_id, status)
select id, company_id, status
from public.profiles
where company_id is not null
on conflict (user_id, company_id) do update
set status = excluded.status,
    updated_at = now();

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_access_assignments enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.user_company_assignments enable row level security;
alter table public.user_site_assignments enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.approval_controls enable row level security;

drop policy if exists "permissions_select_authenticated" on public.permissions;
create policy "permissions_select_authenticated"
on public.permissions
for select
to authenticated
using (true);

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated"
on public.role_permissions
for select
to authenticated
using (true);

drop policy if exists "role_permissions_admin_manage" on public.role_permissions;
create policy "role_permissions_admin_manage"
on public.role_permissions
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);

drop policy if exists "user_access_select_company" on public.user_access_assignments;
create policy "user_access_select_company"
on public.user_access_assignments
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or user_id = auth.uid()
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "user_access_admin_manage" on public.user_access_assignments;
create policy "user_access_admin_manage"
on public.user_access_assignments
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);

drop policy if exists "user_overrides_select_company" on public.user_permission_overrides;
create policy "user_overrides_select_company"
on public.user_permission_overrides
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or user_id = auth.uid()
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "user_overrides_admin_manage" on public.user_permission_overrides;
create policy "user_overrides_admin_manage"
on public.user_permission_overrides
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);

drop policy if exists "user_company_assignments_select_company" on public.user_company_assignments;
create policy "user_company_assignments_select_company"
on public.user_company_assignments
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or user_id = auth.uid()
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "user_company_assignments_admin_manage" on public.user_company_assignments;
create policy "user_company_assignments_admin_manage"
on public.user_company_assignments
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);

drop policy if exists "user_site_assignments_select_company" on public.user_site_assignments;
create policy "user_site_assignments_select_company"
on public.user_site_assignments
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or user_id = auth.uid()
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "user_site_assignments_admin_manage" on public.user_site_assignments;
create policy "user_site_assignments_admin_manage"
on public.user_site_assignments
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);

drop policy if exists "vendor_documents_select_company" on public.vendor_documents;
create policy "vendor_documents_select_company"
on public.vendor_documents
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
  or vendor_id in (select vendor_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "vendor_documents_admin_manage" on public.vendor_documents;
create policy "vendor_documents_admin_manage"
on public.vendor_documents
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
  or public.current_user_has_role('admin')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
  or public.current_user_has_role('admin')
);

drop policy if exists "approval_controls_select_company" on public.approval_controls;
create policy "approval_controls_select_company"
on public.approval_controls
for select
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "approval_controls_admin_manage" on public.approval_controls;
create policy "approval_controls_admin_manage"
on public.approval_controls
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
)
with check (
  public.current_user_has_role('platform_owner')
  or public.current_user_has_role('super_admin')
  or public.current_user_has_role('company_owner')
);
