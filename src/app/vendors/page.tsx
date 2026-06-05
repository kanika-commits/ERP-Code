'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppTopbar } from '@/components/AppTopbar';
import { ProtectedPage } from '@/components/ProtectedPage';
import { supabase } from '@/lib/supabase';
import { useCurrentUserAccess } from '@/lib/useCurrentUserAccess';

type Vendor = {
  address: string | null;
  bank_status: string | null;
  company_id: string | null;
  compliance_notes: string | null;
  id: string;
  vendor_code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  pan_status: string | null;
  gst_status: string | null;
  contact_name: string | null;
  status: string;
  vendor_type: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
};

function VendorsContent() {
  const { isAdmin, loading: loadingAccess } = useCurrentUserAccess();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingVendorId, setEditingVendorId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [name, setName] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [vendorType, setVendorType] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [gstStatus, setGstStatus] = useState('pending');
  const [panStatus, setPanStatus] = useState('pending');
  const [bankStatus, setBankStatus] = useState('pending');
  const [address, setAddress] = useState('');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadVendors() {
    setLoading(true);
    setError('');

    const [vendorResult, companyResult] = await Promise.all([
      supabase
      .from('vendors')
      .select('id,company_id,vendor_code,name,email,phone,gstin,pan,contact_name,status,vendor_type,address,gst_status,pan_status,bank_status,compliance_notes')
      .order('created_at', { ascending: false }),
      supabase.from('companies').select('id,name').order('name', { ascending: true }),
    ]);

    if (vendorResult.error || companyResult.error) {
      setError(vendorResult.error?.message || companyResult.error?.message || 'Could not load vendors.');
    } else {
      setVendors((vendorResult.data ?? []) as Vendor[]);
      setCompanies((companyResult.data ?? []) as CompanyRow[]);
      setCompanyId((current) => current || companyResult.data?.[0]?.id || '');
    }

    setLoading(false);
  }

  useEffect(() => {
    loadVendors();
  }, []);

  function resetVendorForm() {
    setEditingVendorId('');
    setCompanyId(companies[0]?.id || '');
    setName('');
    setVendorCode('');
    setVendorType('');
    setContactName('');
    setEmail('');
    setPhone('');
    setGstin('');
    setPan('');
    setGstStatus('pending');
    setPanStatus('pending');
    setBankStatus('pending');
    setAddress('');
    setComplianceNotes('');
  }

  function editVendor(vendor: Vendor) {
    setEditingVendorId(vendor.id);
    setCompanyId(vendor.company_id || companies[0]?.id || '');
    setName(vendor.name);
    setVendorCode(vendor.vendor_code || '');
    setVendorType(vendor.vendor_type || '');
    setContactName(vendor.contact_name || '');
    setEmail(vendor.email || '');
    setPhone(vendor.phone || '');
    setGstin(vendor.gstin || '');
    setPan(vendor.pan || '');
    setGstStatus(vendor.gst_status || 'pending');
    setPanStatus(vendor.pan_status || 'pending');
    setBankStatus(vendor.bank_status || 'pending');
    setAddress(vendor.address || '');
    setComplianceNotes(vendor.compliance_notes || '');
    setMessage(`Editing ${vendor.name}.`);
    setCreateError('');
  }

  async function saveVendor() {
    setMessage('');
    setCreateError('');

    if (!name || !companyId) {
      setCreateError('Vendor name and company are required.');
      return;
    }

    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch('/api/upsert-vendor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        bankStatus,
        companyId,
        complianceNotes,
        contactName,
        email,
        gstStatus,
        gstin,
        name,
        pan,
        panStatus,
        phone,
        vendorId: editingVendorId || undefined,
        vendorCode,
        vendorType,
      }),
    });

    const result = (await response.json()) as { error?: string; message?: string };
    setCreating(false);

    if (!response.ok) {
      setCreateError(result.error ?? 'Could not save vendor.');
      return;
    }

    setMessage(result.message ?? 'Vendor saved.');
    resetVendorForm();
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
                    <th>Company</th>
                    <th>GSTIN</th>
                    <th>PAN</th>
                    <th>Compliance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length ? (
                    vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>
                          <Link className="table-link table-link-strong" href={`/vendors/${vendor.id}`}>
                            {vendor.name}
                          </Link>
                        </td>
                        <td>{vendor.vendor_code || '-'}</td>
                        <td>
                          {vendor.contact_name || '-'}
                          <br />
                          <span className="muted-text">{vendor.email || vendor.phone || ''}</span>
                        </td>
                        <td>{companies.find((company) => company.id === vendor.company_id)?.name || 'Not linked'}</td>
                        <td>{vendor.gstin || '-'}</td>
                        <td>{vendor.pan || '-'}</td>
                        <td>
                          <span className="status-pill">GST {vendor.gst_status || 'pending'}</span>
                          <span className="status-pill">PAN {vendor.pan_status || 'pending'}</span>
                          <span className="status-pill">Bank {vendor.bank_status || 'pending'}</span>
                        </td>
                        <td>
                          <span className="status-pill">{vendor.status}</span>
                        </td>
                        <td>
                          {isAdmin ? (
                            <button className="ghost-button compact-button" onClick={() => editVendor(vendor)} type="button">
                              Edit
                            </button>
                          ) : (
                            <span className="muted-text">View only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No vendors created yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h2>{editingVendorId ? 'Edit Vendor' : 'Create Vendor'}</h2>
          {loadingAccess ? <p>Checking admin access...</p> : null}
          {!loadingAccess && !isAdmin ? <p>Only users with vendor add/edit permission should maintain vendor masters.</p> : null}
          {!loadingAccess && isAdmin ? (
            <>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="vendor-company">Company</label>
                  <select id="vendor-company" onChange={(event) => setCompanyId(event.target.value)} value={companyId}>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="vendor-name">Vendor name</label>
                  <input id="vendor-name" onChange={(event) => setName(event.target.value)} value={name} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-code">Vendor code</label>
                  <input id="vendor-code" onChange={(event) => setVendorCode(event.target.value)} value={vendorCode} />
                </div>
                <div className="field">
                  <label htmlFor="vendor-type">Vendor type</label>
                  <input id="vendor-type" onChange={(event) => setVendorType(event.target.value)} placeholder="Consultant / Contractor" value={vendorType} />
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
                <div className="field">
                  <label htmlFor="gst-status">GST status</label>
                  <select id="gst-status" onChange={(event) => setGstStatus(event.target.value)} value={gstStatus}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pan-status">PAN status</label>
                  <select id="pan-status" onChange={(event) => setPanStatus(event.target.value)} value={panStatus}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bank-status">Bank status</label>
                  <select id="bank-status" onChange={(event) => setBankStatus(event.target.value)} value={bankStatus}>
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="field form-grid-wide">
                  <label htmlFor="vendor-address">Address</label>
                  <input id="vendor-address" onChange={(event) => setAddress(event.target.value)} value={address} />
                </div>
                <div className="field form-grid-wide">
                  <label htmlFor="compliance-notes">Compliance notes</label>
                  <input id="compliance-notes" onChange={(event) => setComplianceNotes(event.target.value)} value={complianceNotes} />
                </div>
              </div>

              <button className="primary-button action-row" disabled={creating} onClick={saveVendor} type="button">
                {creating ? 'Saving...' : editingVendorId ? 'Update vendor' : 'Create vendor'}
              </button>
              {editingVendorId ? (
                <button className="ghost-button action-row" onClick={resetVendorForm} type="button">
                  Cancel edit
                </button>
              ) : null}

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
