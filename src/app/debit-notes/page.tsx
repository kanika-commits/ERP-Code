'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { LedgerModulePage, money, shortDate } from '@/components/LedgerModulePage';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function DebitNotesPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <LedgerModulePage
            columns={[
              { key: 'debit_note_date', label: 'Debit Note Date', render: (record) => shortDate(record.debit_note_date) },
              { key: 'debit_note_type', label: 'Type' },
              { key: 'total_amount', label: 'Total Amount', render: (record) => money(record.total_amount) },
              { key: 'reason', label: 'Reason' },
            ]}
            amountKey="total_amount"
            countLabel="debit notes"
            dateKey="debit_note_date"
            description="Review debit notes and adjustment reasons across all work orders."
            emptyLabel="No debit notes found."
            orderBy="debit_note_date"
            statusKey="debit_note_type"
            table="debit_notes"
            title="Debit Notes"
          />
        </main>
      )}
    </ProtectedPage>
  );
}
