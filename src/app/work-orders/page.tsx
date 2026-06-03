'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function WorkOrdersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Work Orders</h1>
              <p>The work order module will be built after auth, users, vendors, sites, and projects are stable.</p>
            </div>
            <div className="card">
              <h2>Planned Scope</h2>
              <p>Work order details, RA bills, invoices, payments, debit notes, files, approvals, and ledger PDFs.</p>
            </div>
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

