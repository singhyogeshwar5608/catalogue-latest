'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Package, Phone } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getMyStores, getStorePurchaseInquiries, isApiError } from '@/src/lib/api';
import type { StorePurchaseInquiryRow } from '@/src/lib/api';

function formatInrPaise(paise: number) {
  const rupees = paise / 100;
  const digits = Number.isInteger(rupees) ? 0 : 2;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatWhen(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardOrdersPage() {
  const { isLoggedIn, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [rows, setRows] = useState<StorePurchaseInquiryRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace('/auth?redirect=/dashboard/orders');
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fromUser = user?.stores?.[0]?.id?.trim();
    if (fromUser) {
      setStoreId(fromUser);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const stores = await getMyStores();
        if (cancelled) return;
        setStoreId(stores[0]?.id ? String(stores[0].id) : null);
      } catch {
        if (!cancelled) setStoreId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.stores]);

  const load = useCallback(async () => {
    if (!storeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getStorePurchaseInquiries(storeId, { page, perPage: 20 });
      setRows(res.data);
      setLastPage(Math.max(1, res.pagination.last_page));
    } catch (e) {
      setError(isApiError(e) ? e.message : e instanceof Error ? e.message : 'Could not load orders');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, page]);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      void load();
    }
  }, [authLoading, isLoggedIn, load]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (!storeId && !loading) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-amber-900">
        <p className="font-semibold">No store found</p>
        <p className="mt-2 text-sm text-amber-800/90">Create a store first to see customer orders.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-amber-950 underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-600">
          <Package className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
          <p className="mt-3 font-medium text-slate-800">No orders yet</p>
          <p className="mt-1 text-sm">When customers pay through Razorpay on your catalog, they will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const b = row.buyer ?? {};
            const title = row.product?.title ?? `Product #${row.product_id}`;
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {row.status === 'paid' ? 'Paid' : 'Pending payment'}
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Qty {row.quantity} · {formatInrPaise(row.amount_paise)} · {row.purchase_option}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{formatWhen(row.paid_at ?? row.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">{b.full_name ?? '—'}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {b.phone ?? '—'}
                    </span>
                    {b.email ? <span className="text-slate-600">{b.email}</span> : null}
                  </p>
                  {[b.address_line, b.city, b.state, b.pincode].filter(Boolean).length ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                      {[b.address_line, [b.city, b.state].filter(Boolean).join(', '), b.pincode].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {b.order_notes ? (
                    <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700">
                      <span className="font-semibold text-slate-500">Note: </span>
                      {b.order_notes}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lastPage > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} / {lastPage}
          </span>
          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
