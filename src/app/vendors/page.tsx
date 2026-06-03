'use client';

import { useEffect, useState } from 'react';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type Vendor = {
  id: string;
  vendor_code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  contact_name: string | null;
  status: string;
};

function VendorsContent() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadVendors() {
    setLoading(true);
    setError('');

    const { data, error: vendorError } = await supabase
      .from('vendors')
      .select('id,vendor_code,name,email,phone,gstin,pan,contact_name,status')
      .order('created_at', { ascending: false });

    if (vendorError) {
      setError(vendorError.message);
    } else {
      setVendors(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadVendors();
  }, []);

  async function createVendor() {
    setMessage('');
    setCreateError('');

    if (!name) {
      setCreateError('Vendor name is required.');
      return;
    }

    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/.netlify/functions/create-vendor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contactName,
        email,
        gstin,
        name,
        pan,
        phone,
        vendorCode,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setCreating(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not create vendor.');
      return;
    }

    setMessage(result.message ?? 'Vendor created.');
    setName('');
    setVendorCode('');
    setContactName('');
    setEmail('');
    setPhone('');
    setGstin('');
    setPan('');
    loadVendors();
  }

  return (
    <section className="page">
      <div className="page-title">
        <h1>Vendors</h1>
        <p>Vendor masters and vendor-user links control external portal access.</p>
      </div>

      <div className="stack">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Vendor Master</h2>
              <p>Approved contractors, consultants, suppliers, and external parties.</p>
            </div>
            <span className="pill">{vendors.length} vendors</span>
          </div>

          {loading ? <p>Loading vendors...</p> : null}
          {error ? <div className="error">{error}</div> : null}

          {!loading && !error ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Code</th>
                    <th>Contact</th>
                    <th>GSTIN</th>
                    <th>PAN</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length ? (
                    vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>{vendor.name}</td>
                        <td>{vendor.vendor_code || '-'}</td>
                        <td>
                          {vendor.contact_name || '-'}
                          <br />
                          <span className="muted-text">{vendor.email || vendor.phone || ''}</span>
                        </td>
                        <td>{vendor.gstin || '-'}</td>
                        <td>{vendor.pan || '-'}</td>
                        <td>
                          <span className="status-pill">{vendor.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No vendors created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2>Create Vendor</h2>
          {loadingAccess ? <p>Checking admin access...</p> : null}
          {!loadingAccess && !isAdmin ? <p>Only Admin and Super Admin users can create vendors.</p> : null}
          {!loadingAccess && isAdmin ? (
            <>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="vendor-name">Vendor name</label>
                  <input id="vendor-name" onChange={(event) => setName(event.target.value)} value={name} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-code">Vendor code</label>
                  <input id="vendor-code" onChange={(event) => setVendorCode(event.target.value)} value={vendorCode} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-contact">Contact name</label>
                  <input id="vendor-contact" onChange={(event) => setContactName(event.target.value)} value={contactName} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-email">Email</label>
                  <input id="vendor-email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-phone">Phone</label>
                  <input id="vendor-phone" onChange={(event) => setPhone(event.target.value)} value={phone} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-gstin">GSTIN</label>
                  <input id="vendor-gstin" onChange={(event) => setGstin(event.target.value)} value={gstin} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-pan">PAN</label>
                  <input id="vendor-pan" onChange={(event) => setPan(event.target.value)} value={pan} />
                </div>
              </div>

              <button className="primary-button action-row" disabled={creating} onClick={createVendor} type="button">
                {creating ? 'Creating...' : 'Create vendor'}
              </button>

              {message ? <div className="notice">{message}</div> : null}
              {createError ? <div className="error">{createError}</div> : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function VendorsPage() {
  return (
    <ProtectedPage>
      {() => (
        <main className="app-shell">
          <AppTopbar />
          <VendorsContent />
        </main>
      )}
    </ProtectedPage>
  );
}
