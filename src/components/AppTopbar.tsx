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

  const canUseWorkspace = isInternal || isVendor;

  return (
    <header className="topbar">
      <Link className="brand" href="/modules">
        <strong>MRC ERP</strong>
        <span>Module directory</span>
      </Link>

      <nav className="nav" aria-label="ERP navigation">
        <Link className={activeClass('/dashboard')} href="/dashboard">
          Dashboard
        </Link>
        {canUseWorkspace ? <Link className={activeClass('/modules')} href="/modules">Modules</Link> : null}
        {canUseWorkspace ? <Link className={activeClass('/reports')} href="/reports">Reports</Link> : null}
        {isAdmin ? <Link className={activeClass('/admin/users')} href="/admin/users">Admin</Link> : null}
      </nav>

      <button className="ghost-button" type="button" onClick={signOut}>
        Sign out
      </button>
    </header>
  );
}
