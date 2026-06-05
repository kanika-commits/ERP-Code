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

create table if not exists public.company_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  module_id uuid not null references public.erp_modules(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, module_id)
);

alter table public.profiles add column if not exists company_id uuid references public.companies(id);

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

alter table public.companies enable row level security;
alter table public.erp_modules enable row level security;
alter table public.company_modules enable row level security;

drop policy if exists "companies_select_authenticated" on public.companies;
create policy "companies_select_authenticated"
on public.companies
for select
to authenticated
using (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
  or id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "erp_modules_select_authenticated" on public.erp_modules;
create policy "erp_modules_select_authenticated"
on public.erp_modules
for select
to authenticated
using (true);

drop policy if exists "company_modules_select_authenticated" on public.company_modules;
create policy "company_modules_select_authenticated"
on public.company_modules
for select
to authenticated
using (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
  or company_id in (select company_id from public.profiles where profiles.id = auth.uid())
);

drop policy if exists "companies_admin_manage" on public.companies;
create policy "companies_admin_manage"
on public.companies
for all
to authenticated
using (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
)
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

drop policy if exists "company_modules_admin_manage" on public.company_modules;
create policy "company_modules_admin_manage"
on public.company_modules
for all
to authenticated
using (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
)
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);
