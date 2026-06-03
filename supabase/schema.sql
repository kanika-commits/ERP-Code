-- MRC ERP base schema
-- Keep this file versioned before applying future database changes.

create extension if not exists pgcrypto;

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

insert into public.roles (code, name)
values
  ('super_admin', 'Super Admin'),
  ('admin', 'Admin'),
  ('project_manager', 'Project Manager'),
  ('site_engineer', 'Site Engineer'),
  ('accounts', 'Accounts'),
  ('approver', 'Approver'),
  ('vendor', 'Vendor'),
  ('viewer', 'Viewer')
on conflict (code) do update set name = excluded.name;

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

