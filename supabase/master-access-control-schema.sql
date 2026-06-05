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

-- Backfill user company assignment from profiles.
insert into public.user_company_assignments (user_id, company_id, status)
select id, company_id, status
from public.profiles
where company_id is not null
on conflict (user_id, company_id) do update
set status = excluded.status,
    updated_at = now();

alter table public.user_company_assignments enable row level security;
alter table public.user_site_assignments enable row level security;
alter table public.vendor_documents enable row level security;
alter table public.approval_controls enable row level security;

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
