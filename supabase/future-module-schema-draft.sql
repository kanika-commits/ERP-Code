-- Future ERP module schema draft.
-- Do not run this file yet. It is a planning artifact for the next schema phase.

-- Procurement
-- purchase_requisitions: internal demand before RFQ or purchase order.
-- rfqs: request-for-quotation header linked to project/site/work order when applicable.
-- rfq_vendors: vendors invited to a specific RFQ.
-- quotations: vendor quote header.
-- quotation_items: line-level rates, quantities, tax, delivery terms.
-- comparative_statements: commercial comparison and recommendation.

-- Purchase
-- purchase_orders: approved PO header.
-- purchase_order_items: line items with quantity, rate, GST, and delivery details.
-- goods_receipts: receipt/acceptance records against purchase orders.
-- purchase_bills: vendor purchase bills linked to PO/GRN.
-- three_way_matches: PO vs receipt vs bill exception records.

-- Finance & Accounts
-- bank_accounts: company bank account master.
-- payment_batches: grouped payment release runs.
-- reconciliations: bank/vendor reconciliation records.
-- tax_ledgers: GST/TDS/ITC ledgers by document and period.
-- journal_entries: accounting postings if ERP owns books later.

-- HR
-- departments: department master.
-- employees: employee master linked optionally to auth profiles.
-- attendance_entries: daily attendance/site allocation.
-- leave_requests: leave application and approval status.
-- payroll_runs: monthly payroll headers.
-- reimbursements: employee reimbursement claims.

-- Cross-module controls
-- approval_requests: approval header for any ERP entity.
-- approval_steps: ordered approval steps and decisions.
-- numbering_series: document numbering per module/site/year.
-- audit_events: immutable user/system event log.
-- module_settings: feature flags and module-level configuration.
