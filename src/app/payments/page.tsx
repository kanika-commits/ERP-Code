'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { LedgerModulePage, money, shortDate } from '@/components/LedgerModulePage';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function PaymentsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <LedgerModulePage
            columns={[
              { key: 'payment_date', label: 'Payment Date', render: (record) => shortDate(record.payment_date) },
              { key: 'amount_transferred', label: 'Transferred', render: (record) => money(record.amount_transferred) },
              { key: 'tds_amount', label: 'TDS', render: (record) => money(record.tds_amount) },
              { key: 'total_payment', label: 'Total Payment', render: (record) => money(record.total_payment) },
            ]}
            countLabel="payments"
            description="Review payment transfers, TDS, and totals across all work orders."
            emptyLabel="No payments found."
            orderBy="payment_date"
            table="payments"
            title="Payments"
          />
        </main>
      )}
    </ProtectedPage>
  );
}
