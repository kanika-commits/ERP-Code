'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type ModuleMetric = {
  label: string;
  table: string;
};

const metrics: ModuleMetric[] = [
  { label: 'Work Orders', table: 'work_orders' },
  { label: 'RA Bills', table: 'ra_bills' },
  { label: 'Invoices', table: 'invoices' },
  { label: 'Payments', table: 'payments' },
  { label: 'Debit Notes', table: 'debit_notes' },
  { label: 'Files', table: 'files' },
];

const contractAreas = [
  {
    description: 'Create, review, and open each work order ledger with billing, documents, and download-ready summary.',
    href: '/work-orders',
    label: 'Work Order Register',
  },
  {
    description: 'Track RA bill dates, work done, GST, payable amounts, status, and attached supporting files.',
    href: '/ra-bills',
    label: 'RA Bill Register',
  },
  {
    description: 'Review invoice values, GST, ITC status, vendor/site filters, and invoice file exceptions.',
    href: '/invoices',
    label: 'Invoice Register',
  },
  {
    description: 'Track net transferred, TDS, gross payment, vendor/site/date filters, and payment totals.',
    href: '/payments',
    label: 'Payment Register',
  },
  {
    description: 'Review debit note type, reason, value, date, and work order linkage.',
    href: '/debit-notes',
    label: 'Debit Note Register',
  },
  {
    description: 'Maintain contractor/vendor master records, KYC information, GST/PAN, and vendor access scope.',
    href: '/vendors',
    label: 'Vendor Master',
  },
];

function ContractManagementContent() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      setLoading(true);
      const results = await Promise.all(
        metrics.map(async (metric) => {
          const { count } = await supabase.from(metric.table).select('id', { count: 'exact', head: true });
          return [metric.table, count ?? 0] as const;
        }),
      );

      if (!mounted) return;
      setCounts(Object.fromEntries(results));
      setLoading(false);
    }

    loadCounts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h1>Contract Management</h1>
        <p>Manage the complete contract lifecycle: work orders, RA bills, invoices, payments, debit notes, vendor files, and ledgers.</p>
      </div>

      <div className="module-summary-grid">
        {metrics.map((metric) => (
          <div className="summary-item" key={metric.table}>
            <span>{metric.label}</span>
            <strong>{loading ? '-' : counts[metric.table] ?? 0}</strong>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Contract Workflows</h2>
            <p>Open the register you need, then drill into a work order ledger when more detail is required.</p>
          </div>
          <span className="pill">Active module</span>
        </div>

        <div className="module-grid">
          {contractAreas.map((area) => (
            <Link className="module-card module-card-active" href={area.href} key={area.href}>
              <div className="module-card-head">
                <h3>{area.label}</h3>
                <span className="module-status module-status-active">Open</span>
              </div>
              <p>{area.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ContractManagementPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <ContractManagementContent />
        </main>
      )}
    </ProtectedPage>
  );
}
