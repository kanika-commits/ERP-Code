-- Patch existing early test tables to match the current Work Order module.
-- Run this if the app shows: column work_orders.wo_number does not exist.

alter table public.work_orders
  add column if not exists project_id uuid references public.projects(id),
  add column if not exists site_id uuid references public.sites(id),
  add column if not exists vendor_id uuid references public.vendors(id),
  add column if not exists wo_number text,
  add column if not exists legacy_serial_no text,
  add column if not exists wo_type text,
  add column if not exists description text,
  add column if not exists folder_url text,
  add column if not exists status text not null default 'active',
  add column if not exists basic_value numeric(14, 2) not null default 0,
  add column if not exists gst_amount numeric(14, 2) not null default 0,
  add column if not exists total_value numeric(14, 2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists work_orders_wo_number_key
on public.work_orders (wo_number)
where wo_number is not null;

alter table public.work_orders enable row level security;

drop policy if exists "work_orders_select_authenticated" on public.work_orders;
create policy "work_orders_select_authenticated"
on public.work_orders
for select
to authenticated
using (true);

drop policy if exists "work_orders_insert_admin_only" on public.work_orders;
create policy "work_orders_insert_admin_only"
on public.work_orders
for insert
to authenticated
with check (
  public.current_user_has_role('super_admin')
  or public.current_user_has_role('admin')
);

