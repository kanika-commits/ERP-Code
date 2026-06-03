'use client';

import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';

export default function VendorsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <section className="page">
            <div className="page-title">
              <h1>Vendors</h1>
              <p>Vendor masters and vendor-user links will control the external portal.</p>
            </div>
            <div className="card">
              <h2>Vendor Access</h2>
              <p>Vendor users will only see their own work orders, files, invoices, payments, and ledgers.</p>
            </div>
          </section>
        </main>
      )}
    </ProtectedPage>
  );
}

