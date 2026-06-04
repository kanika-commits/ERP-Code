'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

export function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isInternal, isVendor } = useCurrentUserAccess();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function activeClass(href: string) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return isActive ? 'active' : undefined;
  }

  const canUseLedger = isInternal || isVendor;

  return (
    <header className="topbar">
      <Link className="brand" href="/dashboard">
        <strong>MRC ERP</strong>
        <span>Development workspace</span>
      </Link>

      <nav className="nav" aria-label="ERP navigation">
        <Link className={activeClass('/dashboard')} href="/dashboard">
          Dashboard
        </Link>
        {canUseLedger ? <Link className={activeClass('/contract-management')} href="/contract-management">Contracts</Link> : null}
        {canUseLedger ? <Link className={activeClass('/work-orders')} href="/work-orders">Work Orders</Link> : null}
        {canUseLedger ? <Link className={activeClass('/ra-bills')} href="/ra-bills">RA Bills</Link> : null}
        {canUseLedger ? <Link className={activeClass('/invoices')} href="/invoices">Invoices</Link> : null}
        {canUseLedger ? <Link className={activeClass('/payments')} href="/payments">Payments</Link> : null}
        {canUseLedger ? <Link className={activeClass('/debit-notes')} href="/debit-notes">Debit Notes</Link> : null}
        {isAdmin ? <Link className={activeClass('/vendors')} href="/vendors">Vendors</Link> : null}
        {isAdmin ? <Link className={activeClass('/admin/users')} href="/admin/users">Users</Link> : null}
      </nav>

      <button className="ghost-button" type="button" onClick={signOut}>
        Sign out
      </button>
    </header>
  );
}
