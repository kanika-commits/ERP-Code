# Current System Mapping

This document maps the existing Google Apps Script ERP dashboard to the new Next.js + Supabase ERP. It is based on the exported files in `/Users/kanikapuri/Desktop/Codex`, especially `/Users/kanikapuri/Desktop/Codex/ERP/Code.gs.txt`.

## Safety Rule

The existing Apps Script, live Google Sheets, and live Google Drive folders should remain untouched. Any import or connector should use copied test assets first:

- `ERP TEST - Main Sheet`
- `ERP TEST - Submissions Sheet`
- `ERP TEST - Work Order Files`

Only after testing should we point anything at production data, and even then imports should be read-only unless explicitly approved.

## Existing Apps Script Assets

Main ERP dashboard files:

- `ERP/Code.gs.txt`
- `ERP/Dashboard.html.txt`
- `ERP/Work order.html.txt`
- `ERP/Contractor.html.txt`
- `ERP/Style.html.txt`

Related modules also exported:

- `Dashboard/*`
- `RA Bill/*`
- `Payments/*`
- `Create work order/*`

## Existing Data Sources

The ERP dashboard reads from two Google Sheets and one main Drive folder.

| Existing source | Purpose |
| --- | --- |
| Main Sheet | Summary, contractor info, approved RA bills, invoices, payments, debit notes |
| Submission Sheet | Pending RA bill submissions and pending debit note submissions |
| Work Orders Drive Folder | Work order folders and supporting files |

Tabs used in the main sheet:

| Tab | Existing purpose | New ERP target |
| --- | --- | --- |
| `Summary` | Work order master rows and financial rollups | `work_orders`, linked to `sites`, `projects`, `vendors` |
| `Contractor Info` | Contractor/vendor profile and compliance data | `vendors`, vendor contacts, vendor documents |
| `RA Bills` | Approved RA bill records | `ra_bills` |
| `Invoices` | Invoice records and ITC status | `invoices` |
| `Payments` | Payment records and TDS | `payments` |
| `Debit Notes` | Approved debit notes | `debit_notes` |

Tabs used in the submission sheet:

| Tab | Existing purpose | New ERP target |
| --- | --- | --- |
| `Submissions` | Pending RA bills awaiting approval | `ra_bills` with pending/approval status, or `approval_requests` |
| `Debit Note Submissions` | Pending debit notes awaiting approval | `debit_notes` with pending/approval status, or `approval_requests` |

## Summary To Work Orders

The existing `Summary` tab uses header row 3 and data from row 4. The Apps Script also has fallback column positions, which are useful for migration if headers are inconsistent.

| Existing field | Existing aliases/fallbacks | New ERP target |
| --- | --- | --- |
| Serial number | `S.No.`, `S No`, `Serial No` | `work_orders.legacy_serial_no` |
| Status | `Status`, `WO Status` | `work_orders.status` |
| Site | `Site Name`, `Site`, `Location` | `sites.name` and `work_orders.site_id` |
| Work order number | `WO Number`, `WO No`, `Work Order Number` | `work_orders.wo_number` |
| Folder link | `Folder Link`, `Folder URL`, `WO Folder Link` | `work_orders.folder_url` or `files` |
| Contractor name | `Contractor Name`, `Contractor` | `vendors.name` and `work_orders.vendor_id` |
| Work order type | `WO Type`, `Work Order Type` | `work_orders.wo_type` |
| Description | `Description of Work`, `Description`, `Work Description` | `work_orders.description` |
| Contractor type | `Contractor Type` | `vendors.vendor_type` |
| Subcontractors | `Sub-contractors`, `Subcontractors`, `Sub Contractors` | future `work_order_subcontractors` |
| Basic WO value | `WO Basic Value`, `Basic WO Value`, `Basic Value` | `work_orders.basic_value` |
| WO GST | `WO GST`, `Work Order GST`, `GST on WO` | `work_orders.gst_amount` |
| Total WO value | `Total Value of WO`, `Total WO Amount` | `work_orders.total_value` |
| Amount due | fallback amount due column | computed/reporting field |
| Total work done | fallback total work done column | computed from `ra_bills` |
| Total invoice value | fallback invoice total column | computed from `invoices` |
| Total payments | fallback payments column | computed from `payments` |
| Total debit note value | fallback debit note column | computed from `debit_notes` |

Current dashboard calculations to preserve:

- RA Bills minus Invoices = total RA bill amount payable - total invoice value
- RA Bills minus Payments = total RA bill amount payable - total payments
- Invoices minus Payments = total invoice value - total payments

## Contractor/Vendor Info

The existing `Contractor Info` tab stores profile and compliance data. It also stores many fields as linked text with Drive file URLs.

| Existing field | New ERP target |
| --- | --- |
| Contractor Name | `vendors.name` |
| Contractor Type | `vendors.vendor_type` |
| Contact Person | vendor contacts table |
| Contact Number | vendor contacts table |
| Email / Gmail | vendor contacts table |
| Designation | vendor contacts table |
| PAN | `vendors.pan` and vendor documents |
| Aadhaar / CIN | `vendors.cin_or_aadhaar` and vendor documents |
| GSTIN | vendor GST registrations table |
| PAN linked with Aadhaar | vendor compliance status |
| Bank Details | vendor bank accounts table |
| Additional Docs | vendor documents |

The existing app supports adding missing contractor information and uploading PDF documents into Drive. The new ERP should move this toward structured vendor records plus storage-backed document uploads.

## RA Bills

Approved RA bills are read from the `RA Bills` tab. Rejected rows are skipped.

| Existing field | New ERP target |
| --- | --- |
| WO Number | `ra_bills.work_order_id` |
| RA Bill No. | `ra_bills.ra_bill_no` |
| Approval Status / Status | `ra_bills.status` |
| RA Bill Date / Date | `ra_bills.ra_bill_date` |
| Value of Work Done | `ra_bills.value_of_work_done` |
| Security | `ra_bills.security_amount` |
| GST Rate | `ra_bills.gst_rate` |
| GST Amount | `ra_bills.gst_amount` |
| Amount Payable | `ra_bills.amount_payable` |
| Files / links | `files` linked to `ra_bills` |

Pending RA bills are read from the `Submissions` tab and should become pending RA bill records or approval requests.

## Invoices

Invoices are read from the `Invoices` tab. Rejected invoice/status/ITC rows are skipped.

| Existing field | New ERP target |
| --- | --- |
| WO Number | `invoices.work_order_id` |
| Invoice Number | `invoices.invoice_number` |
| Invoice Date | `invoices.invoice_date` |
| Basic Value | `invoices.basic_value` |
| GST Rate | `invoices.gst_rate` |
| GST | `invoices.gst_amount` |
| Total Amount | `invoices.total_amount` |
| ITC Claimed | `invoices.itc_status` |
| Remarks | `invoices.remarks` |
| Files / links | `files` linked to `invoices` |

## Payments

Payments are read from the `Payments` tab.

| Existing field | New ERP target |
| --- | --- |
| WO Number | `payments.work_order_id` |
| Payment Date | `payments.payment_date` |
| Contractor Name | `payments.vendor_id` |
| Amount Transferred | `payments.amount_transferred` |
| TDS | `payments.tds_amount` |
| Total Payment | `payments.total_payment` |
| Files / links | `files` linked to `payments` |

## Debit Notes

Approved debit notes are read from the `Debit Notes` tab. Rejected rows are skipped.

| Existing field | New ERP target |
| --- | --- |
| WO Number | `debit_notes.work_order_id` |
| Debit Note Date | `debit_notes.debit_note_date` |
| DN Type | `debit_notes.debit_note_type` |
| Approval Status | `debit_notes.status` |
| Total Amount | `debit_notes.total_amount` |
| Reason | `debit_notes.reason` |
| Files / links | `files` linked to `debit_notes` |

Pending debit notes are read from the `Debit Note Submissions` tab and should become pending debit note records or approval requests.

## Drive Files

The old app stores and reads files from Google Drive. It extracts the work order folder URL from the Summary row and scans folders for RA bill files. The new ERP should support:

- Existing Google Drive URL references during migration
- Future uploads into Supabase Storage or Google Cloud Storage
- File metadata in a structured `files` table

Suggested file metadata:

| Field | Purpose |
| --- | --- |
| `entity_type` | work order, vendor, RA bill, invoice, payment, debit note |
| `entity_id` | linked record id |
| `file_name` | display name |
| `storage_provider` | google_drive, supabase_storage, gcs |
| `url` | migrated Drive URL or storage public/signed URL |
| `mime_type` | PDF, XLSX, image, etc. |
| `uploaded_by` | auth user id |

## Vendor Ledger PDF

The requested vendor-facing ledger PDF should be generated from one selected work order and include:

- Company/site/project heading
- Work order number, status, type, description
- Vendor name and contact/compliance summary
- Work order value summary
- RA bill table
- Invoice table
- Payment table
- Debit note table
- Pending RA bill/debit note summary if vendor-facing
- Balance calculations:
  - RA bills minus invoices
  - RA bills minus payments
  - invoices minus payments
- File reference list, if needed

The PDF should not expose internal-only audit comments, unrelated vendors, or private admin-only data.

## New ERP Build Order

Recommended next build sequence:

1. Keep the schema SQL versioned in the repo. The initial full schema SQL should be restored into `supabase/`.
2. Build real `work_orders` create/list/detail screens.
3. Add import from copied test Google Sheets or CSV files.
4. Add RA bill, invoice, payment, and debit note detail tables for each work order.
5. Add ledger preview page.
6. Add ledger PDF download.
7. Add storage uploads after the core data flow is stable.

## Data Still Needed

Before importing real data, collect from test copies:

- Header row screenshots or CSV exports for each tab
- 5-10 sample rows from each tab
- A copied test Drive folder with a few work order files
- Confirmation of which fields vendors are allowed to see in the ledger

