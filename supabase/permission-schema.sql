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

insert into public.roles (code, name)
values
  ('company_owner', 'Company Owner'),
  ('module_admin', 'Module Admin'),
  ('manager', 'Manager'),
  ('staff', 'Staff')
on conflict (code) do update set name = excluded.name;

insert into public.permissions (code, module_code, resource, action, name, is_sensitive)
values
  ('work_orders.view', 'contract_management', 'Work Orders', 'view', 'View Work Orders', false),
  ('work_orders.create', 'contract_management', 'Work Orders', 'create', 'Create Work Orders', false),
  ('work_orders.edit', 'contract_management', 'Work Orders', 'edit', 'Edit Work Orders', false),
  ('work_orders.delete', 'contract_management', 'Work Orders', 'delete', 'Delete Work Orders', true),
  ('work_orders.approve', 'contract_management', 'Work Orders', 'approve', 'Approve Work Orders', true),
  ('work_orders.export', 'contract_management', 'Work Orders', 'export', 'Export Work Orders', false),
  ('ra_bills.view', 'contract_management', 'RA Bills', 'view', 'View RA Bills', false),
  ('ra_bills.create', 'contract_management', 'RA Bills', 'create', 'Create RA Bills', false),
  ('ra_bills.edit', 'contract_management', 'RA Bills', 'edit', 'Edit RA Bills', false),
  ('ra_bills.delete', 'contract_management', 'RA Bills', 'delete', 'Delete RA Bills', true),
  ('ra_bills.approve', 'contract_management', 'RA Bills', 'approve', 'Approve RA Bills', true),
  ('ra_bills.export', 'contract_management', 'RA Bills', 'export', 'Export RA Bills', false),
  ('invoices.view', 'contract_management', 'Invoices', 'view', 'View Invoices', false),
  ('invoices.create', 'contract_management', 'Invoices', 'create', 'Create Invoices', false),
  ('invoices.edit', 'contract_management', 'Invoices', 'edit', 'Edit Invoices', false),
  ('invoices.delete', 'contract_management', 'Invoices', 'delete', 'Delete Invoices', true),
  ('invoices.verify', 'contract_management', 'Invoices', 'approve', 'Verify Invoices', true),
  ('invoices.export', 'contract_management', 'Invoices', 'export', 'Export Invoices', false),
  ('payments.view', 'contract_management', 'Payments', 'view', 'View Payments', false),
  ('payments.create', 'contract_management', 'Payments', 'create', 'Create Payments', false),
  ('payments.edit', 'contract_management', 'Payments', 'edit', 'Edit Payments', true),
  ('payments.delete', 'contract_management', 'Payments', 'delete', 'Delete Payments', true),
  ('payments.approve', 'contract_management', 'Payments', 'approve', 'Approve Payments', true),
  ('payments.export', 'contract_management', 'Payments', 'export', 'Export Payments', false),
  ('debit_notes.view', 'contract_management', 'Debit Notes', 'view', 'View Debit Notes', false),
  ('debit_notes.create', 'contract_management', 'Debit Notes', 'create', 'Create Debit Notes', false),
  ('debit_notes.edit', 'contract_management', 'Debit Notes', 'edit', 'Edit Debit Notes', false),
  ('debit_notes.delete', 'contract_management', 'Debit Notes', 'delete', 'Delete Debit Notes', true),
  ('debit_notes.approve', 'contract_management', 'Debit Notes', 'approve', 'Approve Debit Notes', true),
  ('debit_notes.export', 'contract_management', 'Debit Notes', 'export', 'Export Debit Notes', false),
  ('files.view', 'contract_management', 'Files', 'view', 'View Files', false),
  ('files.upload', 'contract_management', 'Files', 'upload', 'Upload Files', false),
  ('files.download', 'contract_management', 'Files', 'download', 'Download Files', false),
  ('files.delete', 'contract_management', 'Files', 'delete', 'Delete Files', true),
  ('ledgers.view', 'contract_management', 'Ledgers', 'view', 'View Ledgers', false),
  ('ledgers.export', 'contract_management', 'Ledgers', 'export', 'Export Ledgers', false),
  ('ledgers.download', 'contract_management', 'Ledgers', 'download', 'Download Ledger PDFs', false)
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

delete from public.role_permissions
using public.roles r, public.permissions p
where role_permissions.role_id = r.id
  and role_permissions.permission_id = p.id
  and r.code = 'company_owner'
  and p.action = 'delete';

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.module_code = 'contract_management' and p.action <> 'delete'
where r.code = 'company_owner'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.module_code = 'contract_management' and p.action <> 'delete'
where r.code in ('admin', 'module_admin')
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.code in (
  'work_orders.view', 'work_orders.create', 'work_orders.edit',
  'ra_bills.view', 'ra_bills.create', 'ra_bills.edit',
  'invoices.view', 'payments.view', 'debit_notes.view',
  'files.view', 'files.upload', 'files.download',
  'ledgers.view', 'ledgers.export'
)
where r.code in ('project_manager', 'manager')
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.code in (
  'work_orders.view', 'work_orders.approve',
  'ra_bills.view', 'ra_bills.approve',
  'invoices.view', 'payments.view',
  'debit_notes.view', 'debit_notes.approve',
  'ledgers.view', 'files.view', 'files.download'
)
where r.code = 'approver'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.code in (
  'work_orders.view', 'ra_bills.view', 'ra_bills.create',
  'files.view', 'files.upload', 'files.download'
)
where r.code = 'site_engineer'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.code in (
  'work_orders.view', 'ra_bills.view', 'invoices.view',
  'payments.view', 'debit_notes.view', 'files.view',
  'files.download', 'ledgers.view'
)
where r.code in ('viewer', 'staff')
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

insert into public.role_permissions (role_id, permission_id, allowed)
select r.id, p.id, true
from public.roles r
join public.permissions p on p.code in (
  'work_orders.view', 'ra_bills.view', 'invoices.view',
  'payments.view', 'files.view', 'files.download',
  'ledgers.view', 'ledgers.download'
)
where r.code = 'vendor'
on conflict (role_id, permission_id) do update set allowed = excluded.allowed;

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_access_assignments enable row level security;
alter table public.user_permission_overrides enable row level security;

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

drop policy if exists "role_permissions_platform_owner_manage" on public.role_permissions;
create policy "role_permissions_platform_owner_manage"
on public.role_permissions
for all
to authenticated
using (public.current_user_has_role('platform_owner'))
with check (public.current_user_has_role('platform_owner'));

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
  or (
    public.current_user_has_role('super_admin')
    and company_id in (select company_id from public.profiles where profiles.id = auth.uid())
  )
)
with check (
  public.current_user_has_role('platform_owner')
  or (
    public.current_user_has_role('super_admin')
    and company_id in (select company_id from public.profiles where profiles.id = auth.uid())
  )
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

drop policy if exists "user_overrides_super_admin_manage" on public.user_permission_overrides;
create policy "user_overrides_super_admin_manage"
on public.user_permission_overrides
for all
to authenticated
using (
  public.current_user_has_role('platform_owner')
  or (
    public.current_user_has_role('super_admin')
    and company_id in (select company_id from public.profiles where profiles.id = auth.uid())
  )
)
with check (
  public.current_user_has_role('platform_owner')
  or (
    public.current_user_has_role('super_admin')
    and company_id in (select company_id from public.profiles where profiles.id = auth.uid())
  )
);
