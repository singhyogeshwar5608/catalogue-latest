"use client";

import { useEffect, useState } from 'react';
import { BadgeCheck, Ban, Loader2, RefreshCcw, Eye } from 'lucide-react';
import { getAllStores, updateStore } from '@/src/lib/api';
import type { Store } from '@/types';

export default function AdminUsersPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const data = await getAllStores({ limit: 100 });
      setStores(data);
    } catch {
      setMessage({ text: 'Failed to load stores.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleVerify = async (store: Store) => {
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_verified: !store.isVerified });
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, isVerified: !s.isVerified } : s)));
      setMessage({ text: `${store.name} ${store.isVerified ? 'unverified' : 'verified'} successfully.`, type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBan = async (store: Store) => {
    if (!confirm(`Are you sure you want to ${store.isActive ? 'ban' : 'unban'} ${store.name}?`)) return;
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_active: !store.isActive });
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, isActive: !s.isActive } : s)));
      setMessage({ text: `${store.name} ${store.isActive ? 'banned' : 'unbanned'} successfully.`, type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Users Management</h1>
          <p className="text-gray-600">Manage all platform users and stores</p>
        </div>
        <button
          onClick={fetchStores}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IDs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      <div className="flex flex-col">
                        <span>#{store.id}</span>
                        {store.userId && <span className="text-xs text-gray-400">U:{store.userId}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={store.logo} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="font-medium text-gray-900">{store.name}</div>
                          <div className="text-sm text-gray-500">@{store.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{store.businessType}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{store.location}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {store.rating} ⭐ ({store.totalReviews})
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {store.isVerified && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full inline-flex items-center gap-1 w-fit">
                            <BadgeCheck className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {store.isBoosted && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full w-fit">Boosted</span>
                        )}
                        {store.isActive === false && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full w-fit">Banned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/store/${store.username}`}
                          target="_blank"
                          className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          title="View store"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleVerify(store)}
                          disabled={actionId === store.id}
                          className={`inline-flex items-center justify-center rounded-full p-2 border transition disabled:opacity-50 ${
                            store.isVerified
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}
                          title={store.isVerified ? 'Unverify store' : 'Verify store'}
                        >
                          {actionId === store.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleBan(store)}
                          disabled={actionId === store.id}
                          className={`inline-flex items-center justify-center rounded-full p-2 border transition disabled:opacity-50 ${
                            store.isActive === false
                              ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              : 'border-red-200 text-red-600 hover:bg-red-50'
                          }`}
                          title={store.isActive === false ? 'Unban store' : 'Ban store'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
