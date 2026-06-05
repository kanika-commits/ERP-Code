'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { ROLE_LABELS, type RoleCode } from '@/lib/roles';
import { supabase } from '@/lib/supabase';

type Profile = {
  full_name: string | null;
  email: string;
  status: string;
};

type UserRoleRow = {
  scope_type: string;
  roles: {
    code: RoleCode;
    name: string;
  } | null;
};

type SupabaseUserRoleRow = {
  scope_type: string;
  roles:
    | {
        code: RoleCode;
        name: string;
      }
    | {
        code: RoleCode;
        name: string;
      }[]
    | null;
};

type WorkOrderRow = {
  id: string;
  total_value: number | null;
};

type BillingRow = {
  work_order_id: string | null;
  total_amount?: number | null;
  total_payment?: number | null;
  amount_payable?: number | null;
};

type DashboardMetrics = {
  debitNotes: number;
  files: number;
  invoices: number;
  outstanding: number;
  payments: number;
  vendorKycGaps: number;
  vendors: number;
  workOrders: number;
  workOrderValue: number;
  workOrdersWithoutRa: number;
};

const initialMetrics: DashboardMetrics = {
  debitNotes: 0,
  files: 0,
  invoices: 0,
  outstanding: 0,
  payments: 0,
  vendorKycGaps: 0,
  vendors: 0,
  workOrders: 0,
  workOrderValue: 0,
  workOrdersWithoutRa: 0,
};

function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function DashboardContent({ userEmail }: { userEmail?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [metricsError, setMetricsError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        if (!mounted) return;
        setProfileError(userError?.message || 'No signed-in user.');
        setLoadingProfile(false);
        return;
      }

      const { data: profileData, error: profileLoadError } = await supabase
        .from('profiles')
        .select('full_name,email,status')
        .eq('id', user.id)
        .single();

      const { data: roleData, error: roleLoadError } = await supabase
        .from('user_roles')
        .select('scope_type,roles(code,name)')
        .eq('user_id', user.id);

      if (!mounted) return;

      if (profileLoadError) {
        setProfileError(profileLoadError.message);
      } else {
        setProfile(profileData);
      }

      if (!roleLoadError && roleData) {
        const normalizedRoles = (roleData as SupabaseUserRoleRow[]).map((row) => ({
          scope_type: row.scope_type,
          roles: Array.isArray(row.roles) ? row.roles[0] ?? null : row.roles,
        }));
        setRoles(normalizedRoles);
      }

      setLoadingProfile(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      setMetricsError('');

      const [workOrders, raBills, invoices, payments, debitNotes, vendors, files] = await Promise.all([
        supabase.from('work_orders').select('id,total_value'),
        supabase.from('ra_bills').select('work_order_id,amount_payable'),
        supabase.from('invoices').select('work_order_id,total_amount'),
        supabase.from('payments').select('work_order_id,total_payment'),
        supabase.from('debit_notes').select('work_order_id,total_amount'),
        supabase.from('vendors').select('id,gstin,pan'),
        supabase.from('files').select('id'),
      ]);

      if (!mounted) return;

      const firstError =
        workOrders.error || raBills.error || invoices.error || payments.error || debitNotes.error || vendors.error || files.error;

      if (firstError) {
        setMetricsError(firstError.message);
        return;
      }

      const workOrderRows = (workOrders.data ?? []) as WorkOrderRow[];
      const raRows = (raBills.data ?? []) as BillingRow[];
      const invoiceRows = (invoices.data ?? []) as BillingRow[];
      const paymentRows = (payments.data ?? []) as BillingRow[];
      const debitRows = (debitNotes.data ?? []) as BillingRow[];
      const vendorRows = (vendors.data ?? []) as Array<{ gstin: string | null; pan: string | null }>;
      const workOrdersWithRa = new Set(raRows.map((row) => row.work_order_id).filter(Boolean));
      const invoiceTotal = invoiceRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
      const paymentTotal = paymentRows.reduce((sum, row) => sum + Number(row.total_payment ?? 0), 0);
      const debitTotal = debitRows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);

      setMetrics({
        debitNotes: debitRows.length,
        files: files.data?.length ?? 0,
        invoices: invoiceRows.length,
        outstanding: invoiceTotal - paymentTotal - debitTotal,
        payments: paymentRows.length,
        vendorKycGaps: vendorRows.filter((vendor) => !vendor.gstin || !vendor.pan).length,
        vendors: vendorRows.length,
        workOrders: workOrderRows.length,
        workOrderValue: workOrderRows.reduce((sum, row) => sum + Number(row.total_value ?? 0), 0),
        workOrdersWithoutRa: workOrderRows.filter((row) => !workOrdersWithRa.has(row.id)).length,
      });
    }

    loadMetrics();

    return () => {
      mounted = false;
    };
  }, []);

  const roleLabels = roles
    .map((row) => row.roles?.code)
    .filter((code): code is RoleCode => Boolean(code))
    .map((code) => ROLE_LABELS[code] ?? code);

  const alertItems = [
    {
      count: metrics.workOrdersWithoutRa,
      href: '/reports',
      label: 'Work orders without RA bills',
    },
    {
      count: metrics.vendorKycGaps,
      href: '/masters',
      label: 'Vendors missing GSTIN/PAN',
    },
    {
      count: metrics.debitNotes,
      href: '/debit-notes',
      label: 'Debit notes to review',
    },
  ];

  const deadlineItems = [
    {
      date: 'Today',
      label: `${metrics.workOrdersWithoutRa} work orders need billing follow-up`,
    },
    {
      date: 'This week',
      label: `${metrics.invoices} invoices available for finance review`,
    },
    {
      date: 'Planned',
      label: 'Approval deadlines will appear once approval rules are enabled',
    },
  ];

  const reportItems = [
    {
      href: '/reports',
      label: 'Outstanding by work order',
      value: money(metrics.outstanding),
    },
    {
      href: '/reports',
      label: 'Work order exposure',
      value: money(metrics.workOrderValue),
    },
    {
      href: '/reports',
      label: 'Vendor KYC exceptions',
      value: String(metrics.vendorKycGaps),
    },
  ];

  return (
    <section className="page">
      <div className="page-title-row">
        <div className="page-title">
          <h1>Dashboard</h1>
          <p>
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}. Start with alerts, deadlines, messages,
            and reports, then open a module when you need to work.
          </p>
        </div>
        <div className="button-cluster">
          <Link className="primary-button" href="/modules">
            Open Modules
          </Link>
          <Link className="ghost-button" href="/reports">
            Reports
          </Link>
        </div>
      </div>

      <div className="dashboard-hero-grid">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>Alerts</h2>
              <p>Issues that should be checked before work moves forward.</p>
            </div>
            <span className="pill">{alertItems.reduce((sum, item) => sum + item.count, 0)} open</span>
          </div>
          <div className="dashboard-list">
            {alertItems.map((item) => (
              <Link className="dashboard-list-row" href={item.href} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Deadlines</h2>
              <p>Default deadline view. Users can later choose their own widgets.</p>
            </div>
            <span className="pill">Default</span>
          </div>
          <div className="dashboard-list">
            {deadlineItems.map((item) => (
              <div className="dashboard-list-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.date}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Messages</h2>
              <p>ERP messages, approvals, and notices will appear here.</p>
            </div>
            <span className="pill">Inbox</span>
          </div>
          <div className="dashboard-list">
            <div className="dashboard-list-row">
              <span>System notices</span>
              <strong>None</strong>
            </div>
            <div className="dashboard-list-row">
              <span>Approval messages</span>
              <strong>Planned</strong>
            </div>
            <div className="dashboard-list-row">
              <span>Signed in as</span>
              <strong>{loadingProfile ? 'Checking' : roleLabels[0] ?? profile?.email ?? userEmail}</strong>
            </div>
          </div>
        </article>
      </div>

      {profileError ? <div className="error">{profileError}</div> : null}
      {metricsError ? <div className="error">{metricsError}</div> : null}

      <div className="dashboard-main-grid">
        <article className="card dashboard-wide-card">
          <div className="section-head">
            <div>
              <h2>Reports Snapshot</h2>
              <p>High-level reports that help you decide where to go next.</p>
            </div>
            <Link className="table-link" href="/reports">Open reports</Link>
          </div>
          <div className="module-summary-grid">
            {reportItems.map((item) => (
              <Link className="summary-item summary-link" href={item.href} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </Link>
            ))}
            <article className="summary-item">
              <span>Files stored</span>
              <strong>{metrics.files}</strong>
            </article>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Quick Open</h2>
              <p>Jump into the workspaces you use most.</p>
            </div>
          </div>
          <div className="dashboard-shortcut-grid">
            <Link className="ghost-button" href="/modules">Modules</Link>
            <Link className="ghost-button" href="/contract-management">Contract Management</Link>
            <Link className="ghost-button" href="/work-orders">Work Orders</Link>
            <Link className="ghost-button" href="/masters">Master Data</Link>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Customize</h2>
              <p>Later each user will choose which widgets they want on this dashboard.</p>
            </div>
            <span className="pill">Planned</span>
          </div>
          <div className="dashboard-list">
            <div className="dashboard-list-row">
              <span>Default widgets</span>
              <strong>Alerts, Deadlines, Messages, Reports</strong>
            </div>
            <div className="dashboard-list-row">
              <span>Saved shortcuts</span>
              <strong>Coming next</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      {(user) => (
        <main className="app-shell">
          <AppTopbar />
          <DashboardContent userEmail={user.email} />
        </main>
      )}
    </ProtectedPage>
  );
}
