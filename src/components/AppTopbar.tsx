'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

export function AppTopbar() {
  const router = useRouter();
  const { isAdmin, isInternal, isVendor } = useCurrentUserAccess();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <header className="topbar">
      <Link className="brand" href="/dashboard">
        <strong>MRC ERP</strong>
        <span>Development workspace</span>
      </Link>

      <nav className="nav" aria-label="ERP navigation">
        <Link className="active" href="/dashboard">
          Dashboard
        </Link>
        {isAdmin ? <Link href="/admin/users">Users</Link> : null}
        {isInternal || isVendor ? <Link href="/work-orders">Work Orders</Link> : null}
        {isAdmin ? <Link href="/vendors">Vendors</Link> : null}
      </nav>

      <button className="ghost-button" type="button" onClick={signOut}>
        Sign out
      </button>
    </header>
  );
}
