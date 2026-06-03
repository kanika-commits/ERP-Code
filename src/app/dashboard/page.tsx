'use client';

import { useEffect, useState } from 'react';
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

function DashboardContent({ userEmail }: { userEmail?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

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

  const roleLabels = roles
    .map((row) => row.roles?.code)
    .filter((code): code is RoleCode => Boolean(code))
    .map((code) => ROLE_LABELS[code] ?? code);

  return (
    <section className="page">
      <div className="page-title">
        <h1>ERP Dashboard</h1>
        <p>Logged in as {profile?.email ?? userEmail}. The foundation is connected to Supabase Auth.</p>
      </div>

      <div className="grid">
        <article className="card">
          <h2>Auth Foundation</h2>
          <p>Login, logout, protected routing, and session detection are ready for development.</p>
          <div className="metric">Ready</div>
        </article>

        <article className="card">
          <h2>Admin Bootstrap</h2>
          {loadingProfile ? <p>Checking your ERP profile...</p> : null}
          {!loadingProfile && profile ? (
            <>
              <p>{profile.full_name || profile.email} is active in the ERP profile table.</p>
              <div className="metric">{roleLabels[0] ?? 'User'}</div>
            </>
          ) : null}
          {!loadingProfile && profileError ? (
            <>
              <p>Run the bootstrap SQL once in Supabase to create your ERP profile and role.</p>
              <div className="metric">Pending</div>
            </>
          ) : null}
        </article>

        <article className="card">
          <h2>Next Build</h2>
          <p>Admin users and role assignment come next, followed by vendor/site/project masters.</p>
          <div className="metric">M1</div>
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
