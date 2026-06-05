# ERP Master Plan

This document is the central product and engineering map for the MRC ERP. It records the modules, current schema, access model, completed work, pending work, and architecture decisions so the product can grow in a controlled way.

## Product Goal

Build a configurable ERP platform that can first replace MRC's current Google Apps Script, Google Sheets, and Google Drive work-order system, and later be reused for other companies with client-specific modules, roles, permissions, and data.

The product should feel closer to a proper ERP such as Odoo:

- Login opens a useful dashboard with alerts, deadlines, messages, and reports.
- A `Modules` launcher shows the modules assigned to the current company/user.
- Each module has its own workflows, lists, forms, reports, and configuration.
- `Admin & Settings` is a module, not a permanent top navigation item.
- Platform-owner controls stay with the ERP product owner, not with client admins.

## Current Architecture

| Layer | Current Choice | Notes |
| --- | --- | --- |
| Frontend | Next.js App Router | Hosted on Vercel. |
| Auth | Supabase Auth | Email/password and invited users. |
| Database | Supabase PostgreSQL | Main ERP data, roles, modules, permissions, and imported work-order data. |
| File Storage | Supabase Storage plus metadata in `files` | Imported Drive files are copied and linked through ERP metadata. |
| Deployment | Vercel production deployment | GitHub `main` is the source of truth. |
| Source control | GitHub repo `kanika-commits/ERP-Code` | All app/schema/doc changes should be versioned. |
| Legacy import source | Google Sheets and Google Drive copies | Production Apps Script/Sheets/Drive must remain read-only unless explicitly approved. |

## Core Architecture Decisions

1. Keep the current live Apps Script system untouched while ERP is built side by side.
2. Supabase is the system of record for ERP data, auth, and initial storage.
3. Vercel hosts the ERP application; GoDaddy should only be used for domain/DNS.
4. ERP is multi-client from the beginning through `companies`, `erp_modules`, and `company_modules`.
5. Module enable/disable is controlled by the platform owner/product owner, not by normal client admins.
6. Client admins can manage their users and day-to-day permissions only within their allowed company scope.
7. Delete permissions are sensitive and should remain limited to platform owner and super admin by default.
8. Role templates give a default starting point; user-specific overrides provide flexibility when two users with the same role need different rights.
9. Deny overrides should win over allow overrides.
10. UI should avoid backend-looking tables for day-to-day users. Admin screens should be task-oriented: invite user, edit access, enable module, review audit.
11. Contract Management is the first deep module because it maps directly to the existing MRC live process.
12. Files should be attached to their true entity: work order, RA bill, invoice, payment, debit note, vendor, employee, etc. A generic stack of files is not enough.
13. Ledger PDFs should be generated from structured ERP data and only include vendor-safe information.

## ERP Modules

| Module Code | Module Name | Current Route | Purpose | Status |
| --- | --- | --- | --- | --- |
| `masters` | Master Data | `/masters` | Vendors, sites, projects, users, roles, files, and shared control masters. | Started |
| `reports` | Reports & Exceptions | `/reports` | Cross-module exceptions for outstanding balances, overbilling, missing files, GST/ITC, KYC gaps. | Started |
| `projects` | Project Management | `/projects` | Site/project dashboards, budgets, progress, documents, and project-level cost tracking. | Started |
| `contract_management` | Contract Management | `/contract-management` | Work orders, RA bills, invoices, payments, debit notes, approvals, files, and ledgers. | Active priority |
| `procurement` | Procurement | `/procurement` | Vendor requests, RFQs, quotations, comparative statements, and approval workflows. | Placeholder |
| `purchase` | Purchase | `/purchase` | Purchase orders, delivery/receipt tracking, vendor bills, and three-way matching. | Placeholder |
| `finance` | Finance & Accounts | `/finance` | Payables, receivables, GST/ITC, TDS, bank payments, reconciliations, and finance reports. | Started |
| `hr` | HR | `/hr` | Employees, departments, attendance, leave, payroll, reimbursements, documents. | Placeholder |
| `admin` | Admin & Settings | `/admin` | Users, roles, permissions, company settings, module packages, audit logs. | Started |

## Current Database Tables

### Company, Module, And Tenant Control

| Table | Purpose |
| --- | --- |
| `companies` | ERP client companies/tenants such as MRC. |
| `erp_modules` | Product-level module catalog. |
| `company_modules` | Which modules are enabled for each company. |

### Master Data

| Table | Purpose |
| --- | --- |
| `vendors` | Contractor/vendor master. |
| `sites` | Site/location master. |
| `projects` | Project master, linked to sites. |
| `profiles` | ERP user profile mapped to Supabase Auth user. |
| `roles` | Role master. |
| `user_roles` | User role assignments with scope. |

### Contract Management And Finance Spine

| Table | Purpose |
| --- | --- |
| `work_orders` | Work-order master and contract value details. |
| `ra_bills` | RA bill records linked to work orders. |
| `invoices` | Invoice records linked to work orders. |
| `payments` | Payment records linked to work orders/vendors. |
| `debit_notes` | Debit note records linked to work orders. |
| `files` | File metadata linked to ERP entities and storage URLs. |

### Permission Model

| Table | Purpose |
| --- | --- |
| `permissions` | Atomic permission actions such as `work_orders.view`. |
| `role_permissions` | Default permissions assigned to each role. |
| `user_access_assignments` | Scoped role assignments by company/module/site/project/vendor. |
| `user_permission_overrides` | User-specific allow/deny overrides. |

## Planned Database Tables

### Procurement

| Planned Table | Purpose |
| --- | --- |
| `purchase_requisitions` | Internal request for procurement. |
| `rfqs` | Request for quotation header. |
| `rfq_vendors` | Vendors invited to a specific RFQ. |
| `quotations` | Vendor quotation header. |
| `quotation_items` | Quotation line items. |
| `comparative_statements` | Comparison/approval record for quotation selection. |

### Purchase

| Planned Table | Purpose |
| --- | --- |
| `purchase_orders` | Purchase order header. |
| `purchase_order_items` | PO line items. |
| `goods_receipts` | Delivery/receipt records. |
| `purchase_bills` | Vendor bills against PO/receipt. |
| `three_way_matches` | PO, receipt, and bill matching records. |

### Finance

| Planned Table | Purpose |
| --- | --- |
| `bank_accounts` | Company bank account master. |
| `payment_batches` | Grouped payment runs. |
| `reconciliations` | Bank/payment reconciliation. |
| `tax_ledgers` | GST, ITC, TDS, and other tax tracking. |
| `journal_entries` | Accounting journal records. |

### HR

| Planned Table | Purpose |
| --- | --- |
| `employees` | Employee master linked to user profile where applicable. |
| `departments` | Department master. |
| `attendance_entries` | Attendance records. |
| `leave_requests` | Leave request and approval records. |
| `payroll_runs` | Payroll processing runs. |
| `reimbursements` | Employee reimbursement requests and payments. |

### Cross-Module Controls

| Planned Table | Purpose |
| --- | --- |
| `approval_requests` | Generic approval header for module workflows. |
| `approval_steps` | Step-by-step approval routing. |
| `numbering_series` | Configurable document numbering. |
| `audit_events` | System audit log for inserts/updates/deletes/approvals. |
| `module_settings` | Company-specific module configuration. |
| `document_types` | Document categories for file uploads and validations. |
| `cost_centers` | Cost center master for project/finance allocation. |
| `tax_codes` | GST/TDS/other tax code master. |

## Roles

| Role Code | Role Name | Intended Use |
| --- | --- | --- |
| `platform_owner` | Platform Owner | ERP product/business owner. Can control client packages/modules and sensitive platform settings. |
| `super_admin` | Super Admin | Highest client-side admin for a company. Full access inside company and sensitive delete access where allowed. |
| `company_owner` | Company Owner | Company-level owner, broad access but no delete by default. |
| `admin` | Admin | Company admin. Can manage many workflows but no delete by default. |
| `module_admin` | Module Admin | Admin for one module or module group. Permissions should be scoped. |
| `manager` | Manager | Operational manager with create/edit/report access. |
| `project_manager` | Project Manager | Project/work-order management with create/edit access but no delete. |
| `site_engineer` | Site Engineer | Site-level work-order and RA bill access, including file upload. |
| `accounts` | Accounts | Finance/invoice/payment-oriented access. |
| `approver` | Approver | Approval rights for work orders, RA bills, debit notes, etc. |
| `staff` | Staff | Basic internal user access. |
| `vendor` | Vendor | Vendor-scoped access to their own work orders, files, and ledgers. |
| `viewer` | Viewer | Read-only access to allowed areas. |

## Permission Actions

Current permission actions:

- `view`
- `create`
- `edit`
- `delete`
- `approve`
- `export`
- `upload`
- `download`

Current Contract Management resources:

- Work Orders
- RA Bills
- Invoices
- Payments
- Debit Notes
- Files
- Ledgers

Representative permission codes:

- `work_orders.view`
- `work_orders.create`
- `work_orders.edit`
- `work_orders.delete`
- `work_orders.approve`
- `ra_bills.view`
- `ra_bills.create`
- `ra_bills.edit`
- `ra_bills.delete`
- `ra_bills.approve`
- `invoices.view`
- `invoices.create`
- `invoices.edit`
- `invoices.delete`
- `invoices.verify`
- `payments.view`
- `payments.create`
- `payments.edit`
- `payments.delete`
- `payments.approve`
- `debit_notes.view`
- `debit_notes.create`
- `debit_notes.edit`
- `debit_notes.delete`
- `debit_notes.approve`
- `files.view`
- `files.upload`
- `files.download`
- `files.delete`
- `ledgers.view`
- `ledgers.export`
- `ledgers.download`

## Role Permission Defaults

| Role | Default Intent |
| --- | --- |
| Platform Owner | All Contract Management permissions, including sensitive delete permissions. |
| Super Admin | All Contract Management permissions, including sensitive delete permissions. |
| Company Owner | Broad Contract Management access except delete by default. |
| Admin | Broad Contract Management access except delete by default. |
| Module Admin | Broad module access except delete by default. |
| Project Manager | Work-order, RA bill, file upload, ledger, and operational edit access. |
| Site Engineer | Work-order/RA bill view, RA bill create, file upload/download. |
| Accounts | Invoice/payment/debit note/ledger finance access. |
| Approver | View and approve permissions for selected workflows. |
| Staff | Basic view/download permissions. |
| Vendor | Vendor-facing view/download/ledger permissions scoped to one vendor. |
| Viewer | Read-only access to allowed records. |

## Access Rules

1. Supabase Auth handles identity.
2. `profiles` maps auth users into ERP users.
3. `user_roles` stores basic role assignments.
4. `user_access_assignments` will store richer company/module/site/project/vendor scoping.
5. `role_permissions` provides default rights.
6. `user_permission_overrides` allows one user's rights to differ from the role default.
7. Platform owner can manage company module packages.
8. Super admin can manage company-side users but should not control product/package access.
9. Vendor users must be scoped to one vendor and must not see other vendors' work orders/files.
10. Delete should remain guarded and audited.

## Completed Features

### Foundation

- Next.js app initialized and deployed.
- Supabase project connected.
- Supabase Auth login/logout implemented.
- Protected routes implemented.
- GitHub repository connected.
- Vercel production deployment configured.

### User And Role Foundation

- Admin user bootstrap completed.
- Super Admin and Platform Owner roles assigned to Kanika.
- User invite flow implemented through app/API.
- User role assignment screen added.
- Basic role visibility tested with Viewer user.
- Admin page added as a module landing page.
- Users page shows user list and roles.
- User status update API exists.
- Remove user role API exists.

### Company And Module Foundation

- `companies`, `erp_modules`, and `company_modules` schema created.
- MRC company seeded.
- Product module catalog seeded.
- Company Setup page created.
- Module enable/disable controls added for platform owner.
- Admin module hidden from non-admin users in the module launcher.

### ERP Shell And Navigation

- Login opens dashboard.
- Top navigation simplified to Dashboard and Modules.
- Modules page acts as app launcher.
- Admin moved into the modules/admin area.
- Dashboard redesigned toward an ERP command center with alerts, deadlines, messages, reports, and quick links.

### Master Data And Contract Spine

- Vendor, site, project, and work-order tables created.
- Work-order create/list/detail surfaces started.
- Work-order detail page shows related RA bills, invoices, payments, debit notes, and files.
- Test Google Sheet imports added for masters and billing data.
- Imported work orders from copied/test sheet.
- Imported billing data from copied/test sheet.
- Imported/downloaded files from copied Drive folder into Supabase storage/metadata.
- Files are grouped by rough entity type on work-order detail.

### Reports And Ledger

- Reports page started with exception-oriented direction.
- Work-order ledger/detail view started.
- Work-order attached files can be viewed/downloaded.
- Vendor-facing ledger PDF remains pending.

### Documentation

- Current system mapping documented.
- ERP control layer documented.
- Module roadmap documented.
- This master plan created.

## Pending Features

### High Priority: UX And ERP Shell

- Make Dashboard configurable per user.
- Add true alerts/deadlines/messages data instead of mostly derived/planned placeholders.
- Improve Modules page with categories, search, favorites, and clear assignment states.
- Replace backend-looking admin summaries with task-based admin screens.
- Create a clean Admin module home with Users, Roles, Permissions, Company, Modules, Audit, Numbering, Approvals.

### High Priority: User And Permissions UI

- Add edit controls on each user row.
- Allow super admin/platform owner to edit role, scope, status, and custom overrides from a simple user drawer/page.
- Add remove/deactivate user flow with confirmation.
- Add role template editor.
- Add permission override UI.
- Add module assignment/scoping UI by company, site, project, vendor.
- Add audit log for role/permission changes.

### High Priority: Contract Management

- Make Contract Management the first fully polished module.
- Create module landing page with tabs/areas:
  - Overview
  - Work Orders
  - RA Bills
  - Invoices
  - Payments
  - Debit Notes
  - Files
  - Ledgers
  - Reports
  - Settings
- Add create/edit forms for RA bills, invoices, payments, and debit notes.
- Attach files directly to RA bill/invoice/payment/debit note records, not only to work orders.
- On each RA bill row, show its linked files under/inside that RA bill.
- On each invoice row, show its linked invoice file.
- Add pending RA bill and pending debit note flows from submission data.
- Add work-order status workflow.
- Add approval workflow for RA bills and debit notes.
- Add ledger PDF preview and download.

### High Priority: Data Quality And Imports

- Reconcile imported RA bill count with copied Google Sheet source.
- Normalize duplicate/variant RA bill numbers.
- Improve file matching rules for RA bills, invoices, vendor documents, debit notes, and work-order files.
- Add import logs and skipped-row reports.
- Add dry-run import mode.
- Add import idempotency so reruns do not create duplicates.
- Keep all production-source imports read-only until explicitly approved.

### Medium Priority: Finance & Accounts

- Add bank accounts.
- Add payment batches.
- Add GST/ITC tracking.
- Add TDS reporting.
- Add invoice outstanding report.
- Add vendor exposure report.
- Add reconciliation screen.
- Add debit note adjustment logic.

### Medium Priority: Project Management

- Add project dashboard pages.
- Add site drilldown.
- Add project budget/cost tracking.
- Add milestones.
- Add progress updates.
- Add project document grouping.

### Medium Priority: Reports & Exceptions

- Work orders without RA bills.
- RA-billed work orders without invoices.
- Invoices without payments.
- Overbilling/overpayment warnings.
- Missing work-order folders/files.
- Vendor KYC gaps.
- GST/ITC review items.
- Pending approvals.

### Later: Procurement

- Purchase requisition workflow.
- RFQ workflow.
- Vendor quotation entry.
- Comparative statement generation.
- Approval flow from comparison to purchase order.

### Later: Purchase

- Purchase order creation.
- PO line items.
- Goods receipt/delivery tracking.
- Vendor purchase bills.
- Three-way match between PO, receipt, and bill.

### Later: HR

- Employee master.
- Department master.
- Attendance.
- Leave requests.
- Payroll.
- Reimbursements.
- HR documents.

### Later: Platform Owner Backend

- Product-owner portal separate from client admin screens.
- Client/company creation.
- Client module package management.
- Subscription/package settings.
- Tenant-level usage and storage reporting.
- Client status: trial, active, paused, suspended.

## Current Route Map

| Route | Purpose |
| --- | --- |
| `/login` | User login. |
| `/dashboard` | ERP command center. |
| `/modules` | Module launcher. |
| `/admin` | Admin module home. |
| `/admin/users` | User management. |
| `/admin/company` | Company and module setup. |
| `/admin/permissions` | Role/permission model overview. |
| `/masters` | Master data shell. |
| `/reports` | Reports and exception shell. |
| `/projects` | Project management shell. |
| `/contract-management` | Contract module shell. |
| `/work-orders` | Work-order list/create. |
| `/work-orders/[id]` | Work-order detail/ledger view. |
| `/vendors` | Vendor list/create. |
| `/vendors/[id]` | Vendor detail. |
| `/ra-bills` | RA bill shell/list. |
| `/invoices` | Invoice shell/list. |
| `/payments` | Payment shell/list. |
| `/debit-notes` | Debit note shell/list. |
| `/finance` | Finance shell. |
| `/procurement` | Procurement shell. |
| `/purchase` | Purchase shell. |
| `/hr` | HR shell. |

## Legacy System Mapping

Existing Google Sheets tabs map into ERP tables as follows:

| Sheet Tab | ERP Target |
| --- | --- |
| `Summary` | `work_orders`, `sites`, `projects`, `vendors` |
| `Contractor Info` | `vendors`, future vendor contacts/documents |
| `RA Bills` | `ra_bills` |
| `Invoices` | `invoices` |
| `Payments` | `payments` |
| `Debit Notes` | `debit_notes` |
| `Submissions` | future pending `ra_bills` or `approval_requests` |
| `Debit Note Submissions` | future pending `debit_notes` or `approval_requests` |
| Work Order Drive folders | `files` plus Supabase Storage objects |

## File Attachment Decision

The ERP should not show a confusing flat stack of files as the final user experience.

Target behavior:

- Work-order document appears in work-order header/documents.
- RA bill files appear attached to the correct RA bill row/card.
- Invoice files appear attached to the correct invoice row/card.
- Payment files appear attached to the correct payment row/card.
- Debit note files appear attached to the correct debit note row/card.
- Vendor KYC documents appear on vendor profile/compliance.
- A global file list can exist for audit/search, but it should not be the main ledger experience.

## Dashboard Target Design

Default dashboard widgets:

- Alerts
- Deadlines
- Messages
- Reports snapshot
- Pending approvals
- Recent activity
- Quick module shortcuts

User customization later:

- Show/hide widgets.
- Reorder widgets.
- Save default filters.
- Role-based default dashboard layouts.

## Near-Term Build Plan

1. Clean the Admin UX so user/role/module control is obvious from the screen.
2. Polish the Modules launcher and Dashboard with a more ERP-like flow.
3. Deepen Contract Management before other modules:
   - Work-order workspace
   - RA bill workspace
   - Invoice workspace
   - Payment workspace
   - Debit note workspace
   - Entity-linked files
   - Ledger PDF
4. Add structured approval and audit tables.
5. Reconcile imported data and file matching.
6. Only after Contract Management is stable, expand Finance, Project Management, Procurement, Purchase, and HR.

## Operating Rules

- Do not edit the live Apps Script, live Google Sheet, or live Drive folders unless the user explicitly approves.
- Use copied test assets for imports and migration testing.
- Version all schema changes in `supabase/`.
- Run `npm run build` before deployment.
- Push to GitHub before production deploy.
- Deploy to Vercel production after successful build when the user has asked for app changes.
- Never commit `.env.local` or service role keys.
- Prefer product-owner controlled module settings for client packaging.
- Prefer UI changes that make the ERP simpler for business users, not more technical.
