'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { money, shortDate } from '@/components/LedgerModulePage';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';

type InvoiceRow = {
  id: string;
  invoice_date: string | null;
  invoice_number: string | null;
  itc_status: string | null;
  total_amount: number | null;
};

type PaymentRow = {
  id: string;
  payment_date: string | null;
  total_payment: number | null;
};

type DebitNoteRow = {
  id: string;
  debit_note_date: string | null;
  debit_note_type: string | null;
  total_amount: number | null;
};

type RegisterSummary = {
  count: number;
  href: string;
  label: string;
  total: number;
};

type FinanceActivity = {
  amount: number;
  date: string | null;
  href: string;
  id: string;
  label: string;
  meta: string;
  type: string;
};

const registerLinks = [
  {
    description: 'Review vendor invoices, GST values, and ITC status.',
    href: '/invoices',
    label: 'Invoice Register',
  },
  {
    description: 'Track bank transfers, TDS, and gross payments.',
    href: '/payments',
    label: 'Payment Register',
  },
  {
    description: 'Review debit note adjustments and reasons.',
    href: '/debit-notes',
    label: 'Debit Note Register',
  },
];

function valueOf(value: unknown) {
  return Number(value ?? 0);
}

function FinanceContent() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [debitNotes, setDebitNotes] = useState<DebitNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadFinance() {
      setLoading(true);
      setError('');

      const [invoiceResult, paymentResult, debitNoteResult] = await Promise.all([
        supabase.from('invoices').select('id,invoice_date,invoice_number,itc_status,total_amount'),
        supabase.from('payments').select('id,payment_date,total_payment'),
        supabase.from('debit_notes').select('id,debit_note_date,debit_note_type,total_amount'),
      ]);

      if (!mounted) return;

      const loadError = invoiceResult.error || paymentResult.error || debitNoteResult.error;
      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setInvoices((invoiceResult.data ?? []) as InvoiceRow[]);
      setPayments((paymentResult.data ?? []) as PaymentRow[]);
      setDebitNotes((debitNoteResult.data ?? []) as DebitNoteRow[]);
      setLoading(false);
    }

    loadFinance();

    return () => {
      mounted = false;
    };
  }, []);

  const totals = useMemo(() => {
    const invoiceTotal = invoices.reduce((sum, invoice) => sum + valueOf(invoice.total_amount), 0);
    const paymentTotal = payments.reduce((sum, payment) => sum + valueOf(payment.total_payment), 0);
    const debitNoteTotal = debitNotes.reduce((sum, debitNote) => sum + valueOf(debitNote.total_amount), 0);
    const payable = invoiceTotal - debitNoteTotal;
    const outstanding = payable - paymentTotal;

    return {
      debitNoteTotal,
      invoiceTotal,
      outstanding,
      payable,
      paymentTotal,
    };
  }, [debitNotes, invoices, payments]);

  const summaries: RegisterSummary[] = useMemo(
    () => [
      {
        count: invoices.length,
        href: '/invoices',
        label: 'Invoices',
        total: totals.invoiceTotal,
      },
      {
        count: payments.length,
        href: '/payments',
        label: 'Payments',
        total: totals.paymentTotal,
      },
      {
        count: debitNotes.length,
        href: '/debit-notes',
        label: 'Debit Notes',
        total: totals.debitNoteTotal,
      },
    ],
    [debitNotes.length, invoices.length, payments.length, totals.debitNoteTotal, totals.invoiceTotal, totals.paymentTotal],
  );

  const recentActivity: FinanceActivity[] = useMemo(() => {
    return [
      ...invoices.map((invoice) => ({
        amount: valueOf(invoice.total_amount),
        date: invoice.invoice_date,
        href: '/invoices',
        id: `invoice-${invoice.id}`,
        label: invoice.invoice_number || 'Invoice',
        meta: invoice.itc_status || 'ITC status pending',
        type: 'Invoice',
      })),
      ...payments.map((payment) => ({
        amount: valueOf(payment.total_payment),
        date: payment.payment_date,
        href: '/payments',
        id: `payment-${payment.id}`,
        label: 'Payment',
        meta: 'Gross payment',
        type: 'Payment',
      })),
      ...debitNotes.map((debitNote) => ({
        amount: valueOf(debitNote.total_amount),
        date: debitNote.debit_note_date,
        href: '/debit-notes',
        id: `debit-note-${debitNote.id}`,
        label: debitNote.debit_note_type || 'Debit note',
        meta: 'Payable adjustment',
        type: 'Debit Note',
      })),
    ]
      .sort((left, right) => {
        const rightTime = right.date ? new Date(right.date).getTime() : 0;
        const leftTime = left.date ? new Date(left.date).getTime() : 0;
        return rightTime - leftTime;
      })
      .slice(0, 8);
  }, [debitNotes, invoices, payments]);

  return (
    <section className="page">
      <div className="page-title">
        <h1>Finance & Accounts</h1>
        <p>Summarize invoice liabilities, payment movement, debit note adjustments, and current outstanding exposure.</p>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="module-summary-grid">
        <div className="summary-item">
          <span>Payable after debit notes</span>
          <strong>{loading ? '-' : money(totals.payable)}</strong>
        </div>
        <div className="summary-item">
          <span>Outstanding after payments</span>
          <strong>{loading ? '-' : money(totals.outstanding)}</strong>
        </div>
        <div className="summary-item">
          <span>Invoice value</span>
          <strong>{loading ? '-' : money(totals.invoiceTotal)}</strong>
        </div>
        <div className="summary-item">
          <span>Payments released</span>
          <strong>{loading ? '-' : money(totals.paymentTotal)}</strong>
        </div>
        <div className="summary-item">
          <span>Debit note adjustments</span>
          <strong>{loading ? '-' : money(totals.debitNoteTotal)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Finance Registers</h2>
            <p>Open the source register for detailed filtering, work order links, and record-level review.</p>
          </div>
          <span className="pill">{loading ? 'Loading' : 'Live summary'}</span>
        </div>

        <div className="module-grid">
          {registerLinks.map((area) => (
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

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Register Totals</h2>
            <p>High-level totals across the finance source tables.</p>
          </div>
          <span className="pill">{summaries.reduce((sum, summary) => sum + summary.count, 0)} entries</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Register</th>
                <th>Entries</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.href}>
                  <td>{summary.label}</td>
                  <td>{loading ? '-' : summary.count}</td>
                  <td>{loading ? '-' : money(summary.total)}</td>
                  <td>
                    <Link className="ghost-button compact-button" href={summary.href}>
                      View register
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Recent Finance Activity</h2>
            <p>Latest invoices, payments, and debit notes by transaction date.</p>
          </div>
          <span className="pill">{recentActivity.length} latest</span>
        </div>

        {loading ? <p>Loading finance activity...</p> : null}
        {!loading && !recentActivity.length ? <p>No finance records found.</p> : null}

        {!loading && recentActivity.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity) => (
                  <tr key={activity.id}>
                    <td>{shortDate(activity.date)}</td>
                    <td>{activity.type}</td>
                    <td>{activity.label}</td>
                    <td>{activity.meta}</td>
                    <td>{money(activity.amount)}</td>
                    <td>
                      <Link className="ghost-button compact-button" href={activity.href}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function FinancePage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <FinanceContent />
        </main>
      )}
    </ProtectedPage>
  );
}
