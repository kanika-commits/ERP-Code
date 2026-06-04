'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type MasterCountKey = 'vendors' | 'sites' | 'projects' | 'workOrders' | 'users' | 'roles' | 'files';

type CountState = Record<MasterCountKey, number>;

const initialCounts: CountState = {
  files: 0,
  projects: 0,
  roles: 0,
  sites: 0,
  users: 0,
  vendors: 0,
  workOrders: 0,
};

const liveMasters = [
  {
    countKey: 'vendors',
    description: 'Contractors, consultants, suppliers, GST/PAN, contacts, and vendor portal mapping.',
    href: '/vendors',
    name: 'Vendor Master',
    owner: 'Procurement / Contracts / Finance',
  },
  {
    countKey: 'sites',
    description: 'Physical locations where projects and work orders are issued.',
    href: '/projects',
    name: 'Site Master',
    owner: 'Projects',
  },
  {
    countKey: 'projects',
    description: 'Project records mapped to sites and used by work orders and ledgers.',
    href: '/projects',
    name: 'Project Master',
    owner: 'Projects / Contracts',
  },
  {
    countKey: 'workOrders',
    description: 'Commercial contract spine linking vendor, site, project, RA bills, invoices, payments, files, and ledgers.',
    href: '/work-orders',
    name: 'Work Order Master',
    owner: 'Contract Management',
  },
  {
    countKey: 'users',
    description: 'ERP users, statuses, internal/vendor access, and profile records.',
    href: '/admin/users',
    name: 'User Master',
    owner: 'Admin',
  },
  {
    countKey: 'roles',
    description: 'Role definitions and access levels for super admin, admin, finance, project, viewer, and vendor users.',
    href: '/admin/users',
    name: 'Role Master',
    owner: 'Admin',
  },
  {
    countKey: 'files',
    description: 'Uploaded work order, RA bill, invoice, payment, and contractor documents stored in Supabase Storage.',
    href: '/contract-management',
    name: 'File Repository',
    owner: 'Contracts / Finance',
  },
] satisfies Array<{
  countKey: MasterCountKey;
  description: string;
  href: string;
  name: string;
  owner: string;
}>;

const plannedMasters = [
  ['Item / Service Master', 'Services, materials, units, HSN/SAC, and standard descriptions.'],
  ['Cost Center Master', 'Departments, project cost buckets, charge codes, and budget heads.'],
  ['Bank Account Master', 'Company and vendor bank details with approval status.'],
  ['Tax Code Master', 'GST, TDS, ITC treatment, reverse charge, and tax posting rules.'],
  ['Numbering Series', 'WO, PO, RA bill, invoice, debit note, voucher, and approval sequence controls.'],
  ['Approval Matrix', 'Role-wise and amount-wise approvals for contracts, bills, payments, and purchases.'],
  ['Department Master', 'HR, finance, procurement, project, site, and management departments.'],
  ['Document Type Master', 'Required file checklists for vendors, work orders, RA bills, invoices, and payments.'],
];

async function tableCount(table: string) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

function MastersContent() {
  const { isAdmin, isInternal } = useCurrentUserAccess();
  const [counts, setCounts] = useState<CountState>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      setLoading(true);
      setError('');

      try {
        const [vendors, sites, projects, workOrders, users, roles, files] = await Promise.all([
          tableCount('vendors'),
          tableCount('sites'),
          tableCount('projects'),
          tableCount('work_orders'),
          tableCount('profiles'),
          tableCount('roles'),
          tableCount('files'),
        ]);

        if (!mounted) return;

        setCounts({
          files,
          projects,
          roles,
          sites,
          users,
          vendors,
          workOrders,
        });
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Could not load master data counts.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCounts();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page">
      <div className="page-title">
        <h1>Master Data</h1>
        <p>One place to control the ERP lists that every transaction depends on.</p>
      </div>

      <div className="module-summary-grid">
        <article className="summary-item">
          <span>Commercial masters</span>
          <strong>{counts.vendors + counts.sites + counts.projects + counts.workOrders}</strong>
        </article>
        <article className="summary-item">
          <span>Access masters</span>
          <strong>{counts.users + counts.roles}</strong>
        </article>
        <article className="summary-item">
          <span>Stored documents</span>
          <strong>{counts.files}</strong>
        </article>
        <article className="summary-item">
          <span>ERP posture</span>
          <strong>{loading ? 'Loading' : error ? 'Check access' : 'Connected'}</strong>
        </article>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Live Masters</h2>
              <p>These lists are already connected to the current ERP data and are used by work orders, billing, files, and access.</p>
            </div>
            <span className="pill">{liveMasters.length} lists</span>
          </div>

          <div className="module-grid">
            {liveMasters.map((master) => (
              <Link className="module-card module-card-active" href={master.href} key={master.name}>
                <div className="module-card-head">
                  <h3>{master.name}</h3>
                  <span className="module-status module-status-active">{counts[master.countKey]}</span>
                </div>
                <p>{master.description}</p>
                <span className="muted-text">{master.owner}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Planned Masters</h2>
              <p>These are the next lists needed before procurement, purchase, finance, HR, and approval workflows become fully transactional.</p>
            </div>
            <span className="pill">{plannedMasters.length} planned</span>
          </div>

          <div className="module-grid">
            {plannedMasters.map(([name, description]) => (
              <article className="module-card" key={name}>
                <div className="module-card-head">
                  <h3>{name}</h3>
                  <span className="module-status module-status-next">Next</span>
                </div>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Master Data Rules</h2>
          <div className="module-summary-grid">
            <article className="summary-item">
              <span>Single source</span>
              <strong>Masters feed transactions</strong>
            </article>
            <article className="summary-item">
              <span>Access</span>
              <strong>{isAdmin ? 'Admin can maintain' : isInternal ? 'Internal view' : 'Scoped view'}</strong>
            </article>
            <article className="summary-item">
              <span>Quality</span>
              <strong>Reports flag gaps</strong>
            </article>
            <article className="summary-item">
              <span>Audit</span>
              <strong>Approval layer next</strong>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MastersPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <MastersContent />
        </main>
      )}
    </ProtectedPage>
  );
}
