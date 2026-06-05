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

  return (
    <section className="page">
      <div className="page-title">
        <h1>ERP Dashboard</h1>
        <p>Daily command center for alerts, summaries, pending checks, and high-level ERP health.</p>
      </div>

      <div className="grid">
        <article className="card">
          <h2>Current User</h2>
          <p>Logged in as {profile?.email ?? userEmail}.</p>
          <div className="metric">{loadingProfile ? 'Checking' : roleLabels[0] ?? 'User'}</div>
        </article>

        <article className="card">
          <h2>Open Outstanding</h2>
          <p>Invoice value minus payments and debit notes across current imported records.</p>
          <div className="metric">{money(metrics.outstanding)}</div>
        </article>

        <article className="card">
          <h2>Work Order Exposure</h2>
          <p>Total value of work orders currently stored in the ERP database.</p>
          <div className="metric">{money(metrics.workOrderValue)}</div>
        </article>
      </div>

      {profileError ? <div className="error">{profileError}</div> : null}
      {metricsError ? <div className="error">{metricsError}</div> : null}

      <div className="module-summary-grid">
        <article className="summary-item">
          <span>Work orders</span>
          <strong>{metrics.workOrders}</strong>
        </article>
        <article className="summary-item">
          <span>Invoices</span>
          <strong>{metrics.invoices}</strong>
        </article>
        <article className="summary-item">
          <span>Payments</span>
          <strong>{metrics.payments}</strong>
        </article>
        <article className="summary-item">
          <span>Files stored</span>
          <strong>{metrics.files}</strong>
        </article>
      </div>

      <div className="grid">
        <article className="card">
          <div className="section-head">
            <div>
              <h2>Alerts</h2>
              <p>Items that should be checked before records become final.</p>
            </div>
            <Link className="table-link" href="/reports">Open reports</Link>
          </div>
          <div className="stack">
            <div className="summary-item">
              <span>Work orders without RA bills</span>
              <strong>{metrics.workOrdersWithoutRa}</strong>
            </div>
            <div className="summary-item">
              <span>Vendors missing GSTIN/PAN</span>
              <strong>{metrics.vendorKycGaps}</strong>
            </div>
            <div className="summary-item">
              <span>Debit notes to review</span>
              <strong>{metrics.debitNotes}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Quick Actions</h2>
              <p>Common ERP starting points for daily work.</p>
            </div>
          </div>
          <div className="row-actions">
            <Link className="primary-button compact-button" href="/modules">Open module directory</Link>
            <Link className="ghost-button compact-button" href="/work-orders">Work order register</Link>
            <Link className="ghost-button compact-button" href="/reports">Exception reports</Link>
            <Link className="ghost-button compact-button" href="/masters">Master data</Link>
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <h2>Messages</h2>
              <p>ERP notices and workflow messages will appear here as approval flows are added.</p>
            </div>
            <span className="pill">Planned</span>
          </div>
          <div className="stack">
            <div className="summary-item">
              <span>Approvals pending</span>
              <strong>Coming next</strong>
            </div>
            <div className="summary-item">
              <span>System notices</span>
              <strong>None</strong>
            </div>
          </div>
        </article>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>ERP Health</h2>
            <p>The dashboard is intentionally high level. Use the module directory for detailed workflows and registers.</p>
          </div>
          <Link className="table-link" href="/modules">Go to modules</Link>
        </div>
        <div className="module-summary-grid">
          <article className="summary-item">
            <span>Master vendors</span>
            <strong>{metrics.vendors}</strong>
          </article>
          <article className="summary-item">
            <span>Auth</span>
            <strong>{profile ? 'Ready' : loadingProfile ? 'Checking' : 'Review'}</strong>
          </article>
          <article className="summary-item">
            <span>Storage</span>
            <strong>{metrics.files ? 'Ready' : 'Empty'}</strong>
          </article>
          <article className="summary-item">
            <span>Next layer</span>
            <strong>Approvals</strong>
          </article>
        </div>
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
