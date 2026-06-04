'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  columns: Column[];
  countLabel: string;
  description: string;
  emptyLabel: string;
  orderBy: string;
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

export function LedgerModulePage({ columns, countLabel, description, emptyLabel, orderBy, table, title }: LedgerModulePageProps) {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                {records.length ? (
                  records.map((record) => {
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
        ) : null}
      </div>
    </section>
  );
}
