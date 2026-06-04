# MRC ERP Module Roadmap

This roadmap keeps the current imported work-order data safe while the ERP grows module by module. The current system already has authentication, roles, vendors, sites, projects, work orders, RA bills, invoices, payments, debit notes, file storage, and printable work-order ledgers.

## Module Ownership

| Module | Current Live Surface | Current Tables | Next Tables Needed |
| --- | --- | --- | --- |
| Project Management | `/projects`, project/site sections in `/work-orders` | `sites`, `projects`, `work_orders` | project milestones, project budgets, project documents |
| Contract Management | `/contract-management`, `/work-orders`, `/ra-bills`, `/debit-notes` | `work_orders`, `ra_bills`, `debit_notes`, `files` | approvals, contract amendments, direct file links to RA/debit rows |
| Finance & Accounts | `/finance`, `/invoices`, `/payments` | `invoices`, `payments`, `debit_notes`, finance fields in RA bills | bank accounts, reconciliations, journal entries, tax ledgers |
| Procurement | `/procurement`, `/vendors` | `vendors`, derived work-order RFQ queue | purchase requisitions, RFQs, quotations, comparative statements |
| Purchase | `/purchase`, derived PO queue | `work_orders`, vendors | purchase orders, goods receipts, purchase bills, three-way match |
| HR | `/hr`, people/access directory | `profiles`, `roles`, `user_roles` | employees, departments, attendance, leave, payroll, reimbursements |
| Admin & Settings | `/admin/users` | `profiles`, `roles`, `user_roles` | approval rules, numbering formats, audit events, module settings |

## Build Order

1. Strengthen Contract Management because real imported data already exists there.
2. Strengthen Finance & Accounts using invoices, payments, debit notes, GST, ITC, and TDS data.
3. Split Project Management away from the current work-order page with project/site drilldowns.
4. Add Procurement and Purchase tables once workflows are agreed.
5. Add HR tables after employee and payroll requirements are confirmed.
6. Add Admin settings and audit trails across all modules.

## Next Practical Features Without New Schema

| Module | Feature | Why It Matters |
| --- | --- | --- |
| Project Management | Project/site drilldown pages | Lets MRC see each site/project value, WOs, billing, and files in one place. |
| Contract Management | Exception dashboard | Shows missing files, WOs without RA bills, invoices without files, and payment gaps. |
| Finance & Accounts | Outstanding dashboard | Shows invoice total, payments, debit notes, ITC status, and vendor exposure. |
| Procurement | Vendor performance page | Uses existing vendors and WOs to show vendor activity before RFQ tables exist. |
| Purchase | PO shell from work orders | Gives a purchase workspace while real PO tables are designed. |
| HR | People/access directory | Useful now, and becomes the seed for employee master later. |
| Admin & Settings | Scoped access review | Shows who has global/vendor/project-level permissions. |

## Schema Gaps To Close

### Procurement

- `purchase_requisitions`
- `rfqs`
- `rfq_vendors`
- `quotations`
- `quotation_items`
- `comparative_statements`

### Purchase

- `purchase_orders`
- `purchase_order_items`
- `goods_receipts`
- `purchase_bills`
- `three_way_matches`

### Finance

- `bank_accounts`
- `payment_batches`
- `reconciliations`
- `tax_ledgers`
- `journal_entries`

### HR

- `employees`
- `departments`
- `attendance_entries`
- `leave_requests`
- `payroll_runs`
- `reimbursements`

### Cross-Module

- `approval_requests`
- `approval_steps`
- `numbering_series`
- `audit_events`
- `module_settings`

## Access And Security Notes

- Keep Supabase Auth as the identity system.
- Keep `profiles`, `roles`, and `user_roles` as the ERP access model.
- Vendor users should eventually be restricted by vendor scope in RLS, not only by UI.
- Files should move from generic work-order-level linkage to direct entity linkage where possible: `ra_bill`, `invoice`, `payment`, `debit_note`, `vendor`, `employee`.

## Deployment Notes

- Vercel hosts the Next.js app.
- Supabase hosts Auth, Postgres, and current file storage.
- GitHub `main` pushes deploy to Vercel automatically.
- Imported local Drive/Sheet files stay ignored and should not be committed.
