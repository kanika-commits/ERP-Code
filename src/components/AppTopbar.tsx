'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { can } from '@/lib/accessControl';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

export function AppTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const access = useCurrentUserAccess();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function activeClass(href: string) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return isActive ? 'active' : undefined;
  }

  const canUseWorkspace =
    access.isInternal ||
    access.isVendor ||
    can(access, 'work_orders', 'view') ||
    can(access, 'vendors', 'view') ||
    can(access, 'reports', 'view');

  return (
    <header className="topbar">
      <Link className="brand" href="/dashboard">
        <strong>MRC ERP</strong>
        <span>Workspace</span>
      </Link>

      <nav className="nav" aria-label="ERP navigation">
        <Link className={activeClass('/dashboard')} href="/dashboard">
          Dashboard
        </Link>
        {canUseWorkspace ? <Link className={activeClass('/modules')} href="/modules">Modules</Link> : null}
      </nav>

      <button className="ghost-button" type="button" onClick={signOut}>
        Sign out
      </button>
    </header>
  );
}
