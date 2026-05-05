"use client";

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { getAdminSubscriptionInquiries, isApiError } from '@/src/lib/api';

type Inquiry = any;

export default function AdminSubscriptionInquiriesPage() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminSubscriptionInquiries({ perPage: 30, page: 1 });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(isApiError(e) ? e.message : e instanceof Error ? e.message : 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscription Inquiries</h1>
          <p className="mt-1 text-sm text-slate-600">
            Stores that purchased a plan and selected payment features (QR / gateway / help).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          No inquiries yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => {
            const store = r?.store ?? {};
            const plan = r?.plan ?? {};
            const owner = r?.store_owner ?? {};
            const addons = r?.addons ?? {};
            const createdAt = r?.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '—';
            return (
              <div
                key={String(r.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Store</p>
                    <p className="mt-1 truncate text-lg font-bold text-slate-900">
                      {store?.name ?? '—'}{' '}
                      {store?.username ? (
                        <span className="text-sm font-semibold text-slate-500">(@{store.username})</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {store?.location ?? owner?.location ?? '—'}
                      {[store?.district, store?.state].filter(Boolean).length ? (
                        <span className="text-slate-500">
                          {' '}
                          • {[store?.district, store?.state].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                      {owner?.name ? <span>Name: {owner.name}</span> : null}
                      {owner?.mobile ? <span>Mobile: {owner.mobile}</span> : null}
                      {owner?.email ? <span className="break-all">Email: {owner.email}</span> : null}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{plan?.name ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Amount: ₹{Number(r?.amount_paise ?? 0) / 100}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">Created: {createdAt}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-slate-500">QR code</p>
                    <p className="font-semibold text-slate-900">{addons?.qr_code ? 'Enabled' : 'Off'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-slate-500">Payment gateway</p>
                    <p className="font-semibold text-slate-900">{addons?.payment_gateway ? 'Enabled' : 'Off'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <p className="text-xs font-semibold text-slate-500">Gateway help</p>
                    <p className="font-semibold text-slate-900">{addons?.payment_gateway_help ? 'Enabled' : 'Off'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

