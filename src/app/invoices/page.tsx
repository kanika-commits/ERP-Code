'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { LedgerModulePage, money, percent, shortDate } from '@/components/LedgerModulePage';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function InvoicesPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <LedgerModulePage
            columns={[
              { key: 'invoice_number', label: 'Invoice Number' },
              { key: 'invoice_date', label: 'Date', render: (record) => shortDate(record.invoice_date) },
              { key: 'basic_value', label: 'Basic Value', render: (record) => money(record.basic_value) },
              { key: 'gst_rate', label: 'GST Rate', render: (record) => percent(record.gst_rate) },
              { key: 'total_amount', label: 'Total Amount', render: (record) => money(record.total_amount) },
              { key: 'itc_status', label: 'ITC Status' },
            ]}
            amountKey="total_amount"
            countLabel="invoices"
            dateKey="invoice_date"
            description="Review vendor invoices, GST, and ITC status across all work orders."
            emptyLabel="No invoices found."
            orderBy="invoice_date"
            statusKey="itc_status"
            table="invoices"
            title="Invoices"
          />
        </main>
      )}
    </ProtectedPage>
  );
}
