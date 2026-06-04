# ERP Control Layer

This ERP should be organized around a simple operating model:

1. Masters define the approved lists.
2. Transactions use those masters.
3. Files attach to transactions and masters.
4. Reports find commercial, document, tax, and access exceptions.
5. Approval and audit layers control changes before the system goes live.

## Current Spine

The active commercial spine is:

`vendors / sites / projects -> work_orders -> ra_bills / invoices / payments / debit_notes -> files -> ledger / reports`

The work order detail page should remain the single source of truth for contract records because it already combines the contract, billing, payment, debit note, and document history.

## Live Masters

- Vendor Master
- Site Master
- Project Master
- Work Order Master
- User Master
- Role Master
- File Repository

## Planned Masters

- Item / Service Master
- Cost Center Master
- Bank Account Master
- Tax Code Master
- Numbering Series
- Approval Matrix
- Department Master
- Document Type Master

## Reporting Priorities

The first reporting layer should answer practical management questions:

- Which work orders have no RA bills?
- Which RA-billed work orders have no invoices?
- Which invoices are unpaid?
- Which work orders are overbilled or overpaid?
- Which vendors are missing GSTIN or PAN?
- Which work orders are missing folders or expected file categories?
- Which invoices need GST or ITC review?

## Build Direction

Procurement, purchase, finance, HR, approvals, and audit should become deeper only after their masters and transaction tables are added. Until then, the current module pages should clearly show live data where available and planned workflows where schema is still pending.
