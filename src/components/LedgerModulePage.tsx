'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type RelationName = { name: string } | { name: string }[] | null;
type WorkOrderRelation =
  | {
      id: string;
      wo_number: string;
      sites: RelationName;
      vendors: RelationName;
    }
  | {
      id: string;
      wo_number: string;
      sites: RelationName;
      vendors: RelationName;
    }[]
  | null;

type LedgerRecord = Record<string, string | number | null | WorkOrderRelation>;

type Column = {
  key: string;
  label: string;
  render?: (record: LedgerRecord) => string;
};

type LedgerModulePageProps = {
  amountKey?: string;
  columns: Column[];
  countLabel: string;
  dateKey?: string;
  description: string;
  emptyLabel: string;
  orderBy: string;
  statusKey?: string;
  table: string;
  title: string;
};

function relationName<T extends { name: string }>(relation: T | T[] | null) {
  if (Array.isArray(relation)) return relation[0]?.name ?? '-';
  return relation?.name ?? '-';
}

function workOrderFor(record: LedgerRecord) {
  const relation = record.work_orders as WorkOrderRelation;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

export function money(value: unknown) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR',
  }).format(Number(value ?? 0));
}

export function shortDate(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function percent(value: unknown) {
  return `${Number(value ?? 0)}%`;
}

function textValue(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function dateInputValue(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function LedgerModulePage({
  amountKey,
  columns,
  countLabel,
  dateKey,
  description,
  emptyLabel,
  orderBy,
  statusKey,
  table,
  title,
}: LedgerModulePageProps) {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      setError('');

      const { data, error: loadError } = await supabase
        .from(table)
        .select('*,work_orders(id,wo_number,sites(name),vendors(name))')
        .order(orderBy, { ascending: false, nullsFirst: false });

      if (loadError) {
        setError(loadError.message);
      } else {
        setRecords((data ?? []) as LedgerRecord[]);
      }

      setLoading(false);
    }

    loadRecords();
  }, [orderBy, table]);

  const filterOptions = useMemo(() => {
    const vendors: string[] = [];
    const sites: string[] = [];
    const statuses: string[] = [];

    records.forEach((record) => {
      const workOrder = workOrderFor(record);
      vendors.push(relationName(workOrder?.vendors ?? null));
      sites.push(relationName(workOrder?.sites ?? null));
      if (statusKey) statuses.push(String(record[statusKey] ?? ''));
    });

    return {
      sites: uniqueSorted(sites.filter((value) => value !== '-')),
      statuses: uniqueSorted(statuses),
      vendors: uniqueSorted(vendors.filter((value) => value !== '-')),
    };
  }, [records, statusKey]);

  const filteredRecords = useMemo(() => {
    const search = query.trim().toLowerCase();

    return records.filter((record) => {
      const workOrder = workOrderFor(record);
      const vendorName = relationName(workOrder?.vendors ?? null);
      const siteName = relationName(workOrder?.sites ?? null);
      const status = statusKey ? String(record[statusKey] ?? '') : '';
      const recordDate = dateKey ? dateInputValue(record[dateKey]) : '';

      if (vendorFilter && vendorName !== vendorFilter) return false;
      if (siteFilter && siteName !== siteFilter) return false;
      if (statusFilter && status !== statusFilter) return false;
      if (fromDate && (!recordDate || recordDate < fromDate)) return false;
      if (toDate && (!recordDate || recordDate > toDate)) return false;

      if (!search) return true;

      const rowText = [
        workOrder?.wo_number,
        vendorName,
        siteName,
        ...columns.map((column) => record[column.key]),
      ]
        .map(textValue)
        .join(' ');

      return rowText.includes(search);
    });
  }, [columns, dateKey, fromDate, query, records, siteFilter, statusFilter, statusKey, toDate, vendorFilter]);

  const summary = useMemo(() => {
    const workOrderIds = new Set<string>();
    const vendors = new Set<string>();
    let total = 0;

    filteredRecords.forEach((record) => {
      const workOrder = workOrderFor(record);
      if (workOrder?.id) workOrderIds.add(workOrder.id);
      const vendorName = relationName(workOrder?.vendors ?? null);
      if (vendorName !== '-') vendors.add(vendorName);
      if (amountKey) total += Number(record[amountKey] ?? 0);
    });

    return {
      total,
      vendors: vendors.size,
      workOrders: workOrderIds.size,
    };
  }, [amountKey, filteredRecords]);

  const hasFilters = query || vendorFilter || siteFilter || statusFilter || fromDate || toDate;

  function clearFilters() {
    setQuery('');
    setVendorFilter('');
    setSiteFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
  }

  return (
    <section className="page">
      <div className="page-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>{title} Register</h2>
            <p>Entries imported from the work order ledger database.</p>
          </div>
          <span className="pill">
            {records.length} {countLabel}
          </span>
        </div>

        {loading ? <p>Loading {title.toLowerCase()}...</p> : null}
        {error ? <div className="error">{error}</div> : null}

        {!loading && !error ? (
          <>
            <div className="module-summary-grid">
              <div className="summary-item">
                <span>Filtered entries</span>
                <strong>{filteredRecords.length}</strong>
              </div>
              <div className="summary-item">
                <span>Work orders</span>
                <strong>{summary.workOrders}</strong>
              </div>
              <div className="summary-item">
                <span>Vendors</span>
                <strong>{summary.vendors}</strong>
              </div>
              {amountKey ? (
                <div className="summary-item">
                  <span>Total value</span>
                  <strong>{money(summary.total)}</strong>
                </div>
              ) : null}
            </div>

            <div className="module-filter-bar">
              <label>
                Search
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="WO, vendor, site, number" />
              </label>
              <label>
                Vendor
                <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
                  <option value="">All vendors</option>
                  {filterOptions.vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Site
                <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
                  <option value="">All sites</option>
                  {filterOptions.sites.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </label>
              {statusKey ? (
                <label>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">All statuses</option>
                    {filterOptions.statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {dateKey ? (
                <>
                  <label>
                    From
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  </label>
                  <label>
                    To
                    <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  </label>
                </>
              ) : null}
              <button className="ghost-button compact-button" disabled={!hasFilters} type="button" onClick={clearFilters}>
                Clear
              </button>
            </div>

            <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Order</th>
                  <th>Vendor</th>
                  <th>Site</th>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length ? (
                  filteredRecords.map((record) => {
                    const workOrder = workOrderFor(record);
                    return (
                      <tr key={String(record.id)}>
                        <td>{workOrder?.wo_number ?? '-'}</td>
                        <td>{relationName(workOrder?.vendors ?? null)}</td>
                        <td>{relationName(workOrder?.sites ?? null)}</td>
                        {columns.map((column) => (
                          <td key={column.key}>{column.render ? column.render(record) : String(record[column.key] ?? '-')}</td>
                        ))}
                        <td>
                          {workOrder ? (
                            <Link className="ghost-button compact-button" href={`/work-orders/${workOrder.id}`}>
                              View ledger
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + 4}>{emptyLabel}</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
