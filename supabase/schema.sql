-- MRC ERP base schema
-- Keep this file versioned before applying future database changes.

create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company_code text not null unique,
  name text not null,
  legal_name text,
  email_domain text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_modules (
  id uuid primary key default gen_random_uuid(),
  module_code text not null unique,
  name text not null,
  description text,
  href text not null,
  sort_order integer not null default 100,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text unique,
  name text not null,
  email text,
  phone text,
  gstin text,
  pan text,
  contact_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  site_code text unique,
  name text not null,
  location text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id),
  project_code text unique,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  site_id uuid references public.sites(id),
  vendor_id uuid references public.vendors(id),
  wo_number text not null unique,
  legacy_serial_no text,
  wo_type text,
  description text,
  folder_url text,
  status text not null default 'active',
  basic_value numeric(14, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  total_value numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ra_bills (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  ra_bill_no text,
  status text not null default 'pending',
  ra_bill_date date,
  value_of_work_done numeric(14, 2) not null default 0,
  security_amount numeric(14, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  amount_payable numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  invoice_number text,
  invoice_date date,
  basic_value numeric(14, 2) not null default 0,
  gst_rate numeric(5, 2) not null default 0,
  gst_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  itc_status text,
  remarks text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  vendor_id uuid references public.vendors(id),
  payment_date date,
  amount_transferred numeric(14, 2) not null default 0,
  tds_amount numeric(14, 2) not null default 0,
  total_payment numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.debit_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  debit_note_date date,
  debit_note_type text,
  status text not null default 'pending',
  total_amount numeric(14, 2) not null default 0,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  storage_provider text not null default 'google_drive',
  url text not null,
  mime_type text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  full_name text,
  email text,
  status text not null default 'active',
  vendor_id uuid references public.vendors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null default 'global',
  scope_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role_id, scope_type, scope_id)
);

create table if not exists public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_id uuid not null references public.erp_modules(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, module_id)
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
  effect text not null default 'allow' check (effect in ('allow', 'deny')),
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

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
  effect text not null check (effect in ('allow', 'deny')),
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_id, company_id, module_code, scope_type, scope_id)
);

insert into public.roles (code, name)
values
  ('platform_owner', 'Platform Owner'),
  ('company_owner', 'Company Owner'),
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('module_admin', 'Module Admin'),
  ('manager', 'Manager'),
  ('project_manager', 'Project Manager'),
  ('site_engineer', 'Site Engineer'),
  ('accounts', 'Accounts'),
  ('approver', 'Approver'),
  ('staff', 'Staff'),
  ('vendor', 'Vendor'),
  ('viewer', 'Viewer')
on conflict (code) do update set name = excluded.name;

insert into public.user_roles (user_id, role_id, scope_type, scope_id)
select existing_super_admins.user_id, platform_role.id, 'global', '00000000-0000-0000-0000-000000000000'
from public.user_roles existing_super_admins
join public.roles super_role on super_role.id = existing_super_admins.role_id and super_role.code = 'super_admin'
cross join public.roles platform_role
where platform_role.code = 'platform_owner'
on conflict (user_id, role_id, scope_type, scope_id) do nothing;

insert into public.companies (company_code, name, legal_name, email_domain, status)
values ('mrc', 'MRC', 'MRC Group', 'mrcgroup.in', 'active')
on conflict (company_code) do update
set name = excluded.name,
    legal_name = excluded.legal_name,
    email_domain = excluded.email_domain,
    status = excluded.status,
    updated_at = now();

insert into public.erp_modules (module_code, name, description, href, sort_order, status)
values
  ('masters', 'Master Data', 'Central ERP lists for vendors, sites, projects, users, roles, files, and future control masters.', '/masters', 10, 'active'),
  ('reports', 'Reports & Exceptions', 'Cross-module exceptions for outstanding, overbilling, missing documents, KYC gaps, GST, and ITC.', '/reports', 20, 'active'),
  ('projects', 'Project Management', 'Projects, sites, project dashboards, progress, documents, and project-level cost tracking.', '/projects', 30, 'active'),
  ('contract_management', 'Contract Management', 'Work orders, RA bills, invoices, payments, debit notes, files, approvals, and ledgers.', '/contract-management', 40, 'active'),
  ('procurement', 'Procurement', 'Vendor requests, RFQs, quotations, comparative statements, and procurement approvals.', '/procurement', 50, 'active'),
  ('purchase', 'Purchase', 'Purchase orders, delivery/receipt tracking, vendor bills, and three-way matching.', '/purchase', 60, 'active'),
  ('finance', 'Finance & Accounts', 'Payables, receivables, GST/ITC, TDS, bank payments, reconciliations, and finance reports.', '/finance', 70, 'active'),
  ('hr', 'HR', 'Employees, attendance, leave, payroll, reimbursements, documents, and internal HR workflows.', '/hr', 80, 'active'),
  ('admin', 'Admin & Settings', 'Users, roles, permissions, number formats, approval rules, audit logs, and company settings.', '/admin/users', 90, 'active')
on conflict (module_code) do update
set name = excluded.name,
    description = excluded.description,
    href = excluded.href,
    sort_order = excluded.sort_order,
    status = excluded.status,
    updated_at = now();

insert into public.company_modules (company_id, module_id, enabled)
select c.id, m.id, true
from public.companies c
cross join public.erp_modules m
where c.company_code = 'mrc'
on conflict (company_id, module_id) do nothing;

update public.profiles
set company_id = (select id from public.companies where company_code = 'mrc')
where company_id is null;

create or replace function public.current_user_has_role(role_code text)
returns boolean
language sql
stable
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

alter table public.vendors enable row level security;
alter table public.sites enable row level security;
alter table public.projects enable row level security;
alter table public.work_orders enable row level security;
alter table public.ra_bills enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.debit_notes enable row level security;
alter table public.files enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.companies enable row level security;
alter table public.erp_modules enable row level security;
alter table public.company_modules enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_access_assignments enable row level security;
alter table public.user_permission_overrides enable row level security;
