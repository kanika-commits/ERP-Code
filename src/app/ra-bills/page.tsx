'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { LedgerModulePage, money, percent, shortDate } from '@/components/LedgerModulePage';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function RaBillsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <LedgerModulePage
            columns={[
              { key: 'ra_bill_no', label: 'RA Bill No.' },
              { key: 'ra_bill_date', label: 'Date', render: (record) => shortDate(record.ra_bill_date) },
              { key: 'value_of_work_done', label: 'Work Done', render: (record) => money(record.value_of_work_done) },
              { key: 'gst_rate', label: 'GST Rate', render: (record) => percent(record.gst_rate) },
              { key: 'amount_payable', label: 'Amount Payable', render: (record) => money(record.amount_payable) },
              { key: 'status', label: 'Status' },
            ]}
            amountKey="amount_payable"
            countLabel="RA bills"
            dateKey="ra_bill_date"
            description="Review RA bill entries across all work orders."
            emptyLabel="No RA bills found."
            orderBy="ra_bill_date"
            statusKey="status"
            table="ra_bills"
            title="RA Bills"
          />
        </main>
      )}
    </ProtectedPage>
  );
}
