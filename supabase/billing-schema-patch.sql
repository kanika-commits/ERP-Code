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

alter table public.ra_bills add column if not exists work_order_id uuid references public.work_orders(id) on delete cascade;
alter table public.ra_bills add column if not exists ra_bill_no text;
alter table public.ra_bills add column if not exists ra_bill_number text;
alter table public.ra_bills add column if not exists status text not null default 'pending';
alter table public.ra_bills add column if not exists ra_bill_date date;
alter table public.ra_bills add column if not exists value_of_work_done numeric(14, 2) not null default 0;
alter table public.ra_bills add column if not exists security_amount numeric(14, 2) not null default 0;
alter table public.ra_bills add column if not exists gst_rate numeric(5, 2) not null default 0;
alter table public.ra_bills add column if not exists gst_amount numeric(14, 2) not null default 0;
alter table public.ra_bills add column if not exists amount_payable numeric(14, 2) not null default 0;
alter table public.ra_bills add column if not exists created_at timestamptz not null default now();
update public.ra_bills
set ra_bill_no = coalesce(ra_bill_no, ra_bill_number),
    ra_bill_number = coalesce(ra_bill_number, ra_bill_no)
where ra_bill_no is null or ra_bill_number is null;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders(id) on delete cascade,
  vendor_id uuid references public.vendors(id),
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

alter table public.invoices add column if not exists work_order_id uuid references public.work_orders(id) on delete cascade;
alter table public.invoices add column if not exists vendor_id uuid references public.vendors(id);
alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists invoice_date date;
alter table public.invoices add column if not exists basic_value numeric(14, 2) not null default 0;
alter table public.invoices add column if not exists gst_rate numeric(5, 2) not null default 0;
alter table public.invoices add column if not exists gst_amount numeric(14, 2) not null default 0;
alter table public.invoices add column if not exists total_amount numeric(14, 2) not null default 0;
alter table public.invoices add column if not exists itc_status text;
alter table public.invoices add column if not exists remarks text;
alter table public.invoices add column if not exists created_at timestamptz not null default now();

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

alter table public.payments add column if not exists work_order_id uuid references public.work_orders(id) on delete cascade;
alter table public.payments add column if not exists vendor_id uuid references public.vendors(id);
alter table public.payments add column if not exists payment_date date;
alter table public.payments add column if not exists amount_transferred numeric(14, 2) not null default 0;
alter table public.payments add column if not exists tds_amount numeric(14, 2) not null default 0;
alter table public.payments add column if not exists total_payment numeric(14, 2) not null default 0;
alter table public.payments add column if not exists created_at timestamptz not null default now();

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

alter table public.debit_notes add column if not exists work_order_id uuid references public.work_orders(id) on delete cascade;
alter table public.debit_notes add column if not exists debit_note_date date;
alter table public.debit_notes add column if not exists debit_note_type text;
alter table public.debit_notes add column if not exists status text not null default 'pending';
alter table public.debit_notes add column if not exists total_amount numeric(14, 2) not null default 0;
alter table public.debit_notes add column if not exists reason text;
alter table public.debit_notes add column if not exists created_at timestamptz not null default now();

alter table public.ra_bills enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.debit_notes enable row level security;
