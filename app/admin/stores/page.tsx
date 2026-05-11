"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  BellRing,
  Calendar,
  Clock,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import {
  getMyStores,
  updateStore,
  updateStorePaymentIntegration,
  fulfillUpgradeInquiry,
  getStoreSubscription,
  cancelStoreSubscription,
  deleteStore,
} from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import type { Store, StoreSubscription } from '@/types';

interface StoreWithSubscription extends Store {
  subscription?: StoreSubscription | null;
}

export default function AdminStoresPage() {
  const { user: authUser, isLoggedIn } = useAuth();
  const [stores, setStores] = useState<StoreWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreWithSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'boosted' | 'banned'>('all');
  const [addonModalStore, setAddonModalStore] = useState<StoreWithSubscription | null>(null);
  const [addonModalPg, setAddonModalPg] = useState(false);
  const [addonModalQr, setAddonModalQr] = useState(false);
  const [addonModalPgHelp, setAddonModalPgHelp] = useState(false);
  const [addonModalSaving, setAddonModalSaving] = useState(false);
  const [addonEnableConfirmOpen, setAddonEnableConfirmOpen] = useState(false);
  const [addonUploadOpen, setAddonUploadOpen] = useState(false);
  const [addonModalRazorpayKeyId, setAddonModalRazorpayKeyId] = useState('');
  const [addonModalRazorpaySecret, setAddonModalRazorpaySecret] = useState('');
  const [addonModalQrFile, setAddonModalQrFile] = useState<File | null>(null);

  // PG column dropdown draft values.
  const [addonDropdownOpenStoreId, setAddonDropdownOpenStoreId] = useState<string | null>(null);
  const [addonDraftQr, setAddonDraftQr] = useState(false);
  const [addonDraftPg, setAddonDraftPg] = useState(false);
  const getDistrictStateLabel = (store: StoreWithSubscription) => {
    const explicit = [store.district, store.state].filter(Boolean).join(', ');
    if (explicit) return explicit;

    const raw = (store.location ?? '').trim();
    if (!raw) return '—';
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
    }
    return raw;
  };

  const fetchStores = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!isLoggedIn || authUser?.role !== 'super_admin') {
        if (!opts?.silent) setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      try {
        /** JWT decides server-side; avoids stale `/stores` CDN cache & bad `getStoredUser().role` reads. */
        const data = await getMyStores();
        const storesWithSubscriptions = await Promise.all(
          data.map(async (store) => {
            try {
              const subData = await getStoreSubscription(store.id);
              return { ...store, subscription: subData.activeSubscription || null };
            } catch {
              return { ...store, subscription: null };
            }
          })
        );
        setStores(storesWithSubscriptions);
      } catch (error) {
        console.error('Failed to load stores:', error);
        setMessage({ text: 'Failed to load stores.', type: 'error' });
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [isLoggedIn, authUser?.role, authUser?.id]
  );

  const handleDelete = async (store: Store) => {
    if (!confirm(`Delete ${store.name}? This action cannot be undone.`)) return;
    setActionId(store.id);
    try {
      await deleteStore(store.id);
      setMessage({ text: `${store.name} deleted successfully.`, type: 'success' });
      await fetchStores();
      setSelectedStore((current) => (current?.id === store.id ? null : current));
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to delete store.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

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

  const handleLifetimeChange = async (store: Store, nextValue: boolean) => {
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_lifetime: nextValue });
      setStores((prev) =>
        prev.map((s) =>
          s.id === store.id ? { ...s, isLifetime: nextValue, lifetimeAccess: nextValue } : s,
        ),
      );
      await fetchStores({ silent: true });
      setMessage({ text: `${store.name} lifetime service ${nextValue ? 'enabled' : 'disabled'}.`, type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to update lifetime service.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEdit = (store: Store) => {
    // Navigate to store edit page or open edit modal
    // For now, show a message that edit functionality is coming soon
    setMessage({ text: `Edit functionality for ${store.name} coming soon!`, type: 'success' });
    setTimeout(() => setMessage(null), 3000);
  };

  const openAddonModal = (store: StoreWithSubscription) => {
    setAddonModalStore(store);
    setAddonModalPg(Boolean(store.subscriptionAddons?.paymentGateway));
    setAddonModalQr(Boolean(store.subscriptionAddons?.qrCode));
    setAddonModalPgHelp(Boolean(store.subscriptionAddons?.paymentGatewayHelp));
    setAddonEnableConfirmOpen(false);
    setAddonUploadOpen(false);
    setAddonModalRazorpayKeyId('');
    setAddonModalRazorpaySecret('');
    setAddonModalQrFile(null);
  };

  const openAddonConfirmFromDropdown = (
    store: StoreWithSubscription,
    pg: boolean,
    qr: boolean,
    pgHelp: boolean,
  ) => {
    setAddonModalStore(store);
    setAddonModalPg(pg);
    setAddonModalQr(qr);
    setAddonModalPgHelp(pgHelp);
    setAddonEnableConfirmOpen(true);
    setAddonUploadOpen(false);
    setAddonModalRazorpayKeyId('');
    setAddonModalRazorpaySecret('');
    setAddonModalQrFile(null);
    setAddonDropdownOpenStoreId(null);
  };

  const closeAddonSelection = () => {
    setAddonEnableConfirmOpen(false);
    setAddonUploadOpen(false);
    setAddonModalStore(null);
    setAddonModalSaving(false);
    setAddonDropdownOpenStoreId(null);
    setAddonModalRazorpayKeyId('');
    setAddonModalRazorpaySecret('');
    setAddonModalQrFile(null);
  };

  const openUploadStep = () => {
    setAddonEnableConfirmOpen(false);
    setAddonUploadOpen(true);
  };

  const handleConfirmEnableAddons = async () => {
    if (!addonModalStore) return;

    const isEnablingPg = addonModalPg && !addonModalStore.subscriptionAddons?.paymentGateway;
    const isEnablingQr = addonModalQr && !addonModalStore.subscriptionAddons?.qrCode;

    // If we are enabling PG or QR, we MUST show the upload step first.
    // We only fulfill the inquiry AFTER the data is provided in the next step.
    if (isEnablingPg || isEnablingQr) {
      openUploadStep();
      return;
    }

    // Otherwise (disabling, or just toggling Help), we fulfill immediately.
    setAddonModalSaving(true);
    try {
      await fulfillUpgradeInquiry(addonModalStore.id, {
        addonPaymentGateway: addonModalPg,
        addonQrCode: addonModalQr,
        addonPaymentGatewayHelp: addonModalPgHelp,
      });

      setMessage({ text: 'Settings updated successfully.', type: 'success' });
      closeAddonSelection();
      await fetchStores({ silent: true });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to update settings.',
        type: 'error',
      });
    } finally {
      setAddonModalSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const fileToQrBase64Payload = (file: File) =>
    new Promise<{ payment_qr_base64: string; payment_qr_mime: string }>(
      (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          const comma = dataUrl.indexOf(',');
          if (comma < 0) {
            reject(new Error('Invalid QR file.'));
            return;
          }
          resolve({
            payment_qr_base64: dataUrl.slice(comma + 1),
            payment_qr_mime: file.type || 'image/png',
          });
        };
        reader.onerror = () => reject(new Error('Could not read QR file.'));
        reader.readAsDataURL(file);
      },
    );

  const handleSaveUploadStep = async () => {
    if (!addonModalStore) return;

    // Validate if data is provided for newly enabled features
    const isEnablingPg = addonModalPg && !addonModalStore.subscriptionAddons?.paymentGateway;
    const isEnablingQr = addonModalQr && !addonModalStore.subscriptionAddons?.qrCode;

    if (isEnablingPg && (!addonModalRazorpayKeyId.trim() || !addonModalRazorpaySecret.trim())) {
      setMessage({ text: 'Please provide both Razorpay Key ID and Secret to enable Payment Gateway.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (isEnablingQr && !addonModalQrFile) {
      setMessage({ text: 'Please upload a QR code image to enable QR Code payments.', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setAddonModalSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (addonModalPg && addonModalRazorpayKeyId.trim()) {
        body.razorpay_key_id = addonModalRazorpayKeyId.trim();
        body.razorpay_key_secret = addonModalRazorpaySecret.trim();
      }

      if (addonModalQr && addonModalQrFile) {
        const qrPayload = await fileToQrBase64Payload(addonModalQrFile);
        Object.assign(body, qrPayload);
      }

      // Step 1: Save keys/QR data if any
      if (Object.keys(body).length > 0) {
        await updateStorePaymentIntegration(addonModalStore.id, body);
      }

      // Step 2: Fulfill inquiry (this actually sets the flags in backend)
      await fulfillUpgradeInquiry(addonModalStore.id, {
        addonPaymentGateway: addonModalPg,
        addonQrCode: addonModalQr,
        addonPaymentGatewayHelp: addonModalPgHelp,
      });

      setMessage({ text: 'Integration details saved and features enabled.', type: 'success' });
      closeAddonSelection();
      await fetchStores({ silent: true });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Failed to save integration details.',
        type: 'error',
      });
    } finally {
      setAddonModalSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleBan = async (store: Store) => {
    if (!store || !store.id) {
      setMessage({ text: 'Invalid store data.', type: 'error' });
      return;
    }

    const storeName = store.name?.trim() || 'Unknown Store';
    const isActive = store.isActive;
    
    if (!confirm(`Are you sure you want to ${isActive ? 'ban' : 'unban'} ${storeName}?`)) return;
    
    setActionId(store.id);
    try {
      await updateStore({ id: store.id, is_active: !isActive });
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, isActive: !isActive } : s)));
      setMessage({ text: `${storeName} ${isActive ? 'banned' : 'unbanned'} successfully.`, type: 'success' });
    } catch (err) {
      console.error('Ban error:', err);
      setMessage({ text: err instanceof Error ? err.message : 'Action failed.', type: 'error' });
    } finally {
      setActionId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    
    setSubscriptionLoading(true);
    try {
      await cancelStoreSubscription(subscriptionId);
      setMessage({ text: 'Subscription cancelled successfully.', type: 'success' });
      await fetchStores();
      setSelectedStore(null);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Failed to cancel subscription.', type: 'error' });
    } finally {
      setSubscriptionLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  const normalizedSearch = (searchTerm ?? '').trim().toLowerCase();

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    stores.forEach((store) => {
      if (store.categoryName) {
        set.add(store.categoryName);
      } else if (store.businessType) {
        set.add(store.businessType);
      }
    });
    return Array.from(set).sort();
  }, [stores]);

  const filteredStores = useMemo(() => {
    const numericSearch = normalizedSearch.replace(/#/g, '').trim();
    const isNumericSearch = numericSearch.length > 0 && /^\d+$/.test(numericSearch);

    return stores.filter((store) => {
      const matchesId = isNumericSearch ? String(store.id).includes(numericSearch) : false;

      const matchesSearch = normalizedSearch
        ? [
            store.id,
            `#${store.id}`,
            store.name,
            store.username,
            store.businessType,
            store.categoryName,
            store.location,
            store.district,
            store.state,
            store.user?.name,
            store.user?.email,
          ]
            .filter(Boolean)
            .some((field) => field!.toLowerCase().includes(normalizedSearch))
        : true;

      const matchesCategory =
        categoryFilter === 'all' ||
        store.categoryName === categoryFilter ||
        store.businessType === categoryFilter;

      const matchesStatus = (() => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'verified') return Boolean(store.isVerified);
        if (statusFilter === 'boosted') return Boolean(store.isBoosted || store.activeBoost);
        if (statusFilter === 'banned') return store.isActive === false;
        return true;
      })();

      return (matchesId || matchesSearch) && matchesCategory && matchesStatus;
    });
  }, [stores, normalizedSearch, categoryFilter, statusFilter]);

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="mb-8 flex flex-col items-center justify-between gap-4 md:flex-row md:items-center">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Stores Management</h1>
          <p className="text-gray-600">Manage all stores, subscriptions, and details</p>
        </div>
        <button
          onClick={() => void fetchStores()}
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

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by store, owner, location..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div className="flex gap-3 lg:col-span-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All statuses</option>
              <option value="verified">Verified</option>
              <option value="boosted">Boosted</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white shadow-md">
          <div
            className="max-h-[calc(100vh-15rem)] overflow-x-auto overflow-y-auto overscroll-x-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] sm:max-h-[calc(100vh-11rem)] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-gray-100"
            style={{ touchAction: 'pan-x pan-y' }}
          >
            {/* w-full removed: it was squeezing many columns into the viewport; min-w-max keeps natural widths + horizontal scroll */}
            <table className="min-w-max table-auto border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 shadow-[0_1px_0_0_rgb(229_231_235)]">
                <tr>
                  <th className="w-[72px] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">ID</th>
                  <th className="min-w-[10rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Store</th>
                  <th className="min-w-[7rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Category</th>
                  <th className="hidden md:table-cell md:min-w-[5.5rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">P/S</th>
                  <th className="hidden lg:table-cell lg:min-w-[6rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">WhatsApp</th>
                  <th className="hidden lg:table-cell lg:min-w-[7rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Area</th>
                  <th className="hidden xl:table-cell xl:min-w-[6.5rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Plan</th>
                  <th className="hidden xl:table-cell w-[4.5rem] px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">QR Code</th>
                  <th className="hidden xl:table-cell w-[4.5rem] px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Payment Gateway</th>
                  <th className="hidden xl:table-cell w-[4.5rem] px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">PG Approval Help</th>
                  <th className="hidden xl:table-cell w-[4.5rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Life</th>
                  <th className="min-w-[5.5rem] px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Status</th>
                  <th className="min-w-[11rem] px-2 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-10 text-center text-sm text-gray-500">
                      No stores match the current search or filters.
                    </td>
                  </tr>
                )}
                {filteredStores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 align-top">
                      <span className="text-xs font-mono text-gray-500">#{store.id}</span>
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 break-words text-sm font-semibold leading-snug text-gray-900">
                          <span>{store.name}</span>
                          {store.hasPendingSubscriptionInquiry ? (
                            <span title="New upgrade inquiry" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <BellRing className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <div className="break-all text-[11px] text-gray-500 font-medium">
                          {store.user?.email || store.email || '—'}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[10rem] px-3 py-2 align-top">
                      <div className="break-words text-[11px] font-medium leading-tight text-gray-900">
                        {store.categoryName || store.businessType}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2 align-top">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          {store.productsCount || 0}P
                        </span>
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                          {store.servicesCount || 0}S
                        </span>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell max-w-[8rem] px-3 py-2 align-top">
                      {store.whatsapp || store.phone ? (
                        <div className="flex items-center gap-1 break-all text-[12px] text-green-700">
                          <Phone className="h-3 w-3 shrink-0" />
                          {store.whatsapp || store.phone}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell max-w-[9rem] px-3 py-2 align-top">
                      <div className="flex items-start gap-1 text-xs text-gray-700">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="break-words leading-snug">{getDistrictStateLabel(store)}</span>
                      </div>
                    </td>
                    <td className="hidden xl:table-cell max-w-[8rem] px-3 py-2 align-top">
                      {store.subscription ? (
                        <span className="block break-words text-xs font-medium text-gray-900">{store.subscription.plan.name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(store.subscriptionAddons?.qrCode)}
                        onChange={(e) => {
                          const val = e.target.checked;
                          openAddonConfirmFromDropdown(
                            store,
                            Boolean(store.subscriptionAddons?.paymentGateway),
                            val,
                            Boolean(store.subscriptionAddons?.paymentGatewayHelp)
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 align-top text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(store.subscriptionAddons?.paymentGateway)}
                          onChange={(e) => {
                            const val = e.target.checked;
                            openAddonConfirmFromDropdown(
                              store,
                              val,
                              Boolean(store.subscriptionAddons?.qrCode),
                              Boolean(store.subscriptionAddons?.paymentGatewayHelp)
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </div>
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(store.subscriptionAddons?.paymentGatewayHelp)}
                        onChange={(e) => {
                          const val = e.target.checked;
                          openAddonConfirmFromDropdown(
                            store,
                            Boolean(store.subscriptionAddons?.paymentGateway),
                            Boolean(store.subscriptionAddons?.qrCode),
                            val
                          );
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="hidden xl:table-cell px-3 py-2 align-top">
                      <select
                        value={store.lifetimeAccess || store.isLifetime ? 'yes' : 'no'}
                        onChange={(event) => handleLifetimeChange(store, event.target.value === 'yes')}
                        disabled={actionId === store.id}
                        className="w-full max-w-[4.5rem] rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        title="Lifetime service"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-0.5">
                        {store.isActive !== false && (
                          <span className="w-fit rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">Active</span>
                        )}
                        {store.isVerified && (
                          <span className="inline-flex w-fit items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                            <BadgeCheck className="h-3 w-3" /> Ver
                          </span>
                        )}
                        {store.isBoosted && (
                          <span className="w-fit rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">Boost</span>
                        )}
                        {store.isActive === false && (
                          <span className="w-fit rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">Banned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStore(store)}
                          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerify(store)}
                          disabled={actionId === store.id}
                          className="rounded-md p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
                          title={store.isVerified ? 'Unverify' : 'Verify'}
                        >
                          {actionId === store.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBan(store)}
                          disabled={actionId === store.id}
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title={store.isActive === false ? 'Unban' : 'Ban'}
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(store)}
                          disabled={actionId === store.id}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          title="Permanently delete store from site"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          Delete
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

      {addonModalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-bold text-gray-900">Payment Add-ons</h3>
              <button
                type="button"
                onClick={closeAddonSelection}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              {addonEnableConfirmOpen ? (
                <>
                  <p className="text-sm font-medium text-gray-900">
                    Update add-on settings for <span className="font-bold">{addonModalStore.name}</span>?
                  </p>
                  <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      You are modifying store access
                    </p>
                    <p className="text-sm text-amber-900/90">
                      QR code: <span className="font-semibold">{addonModalQr ? 'Enable' : 'Disable'}</span>
                      <br />
                      Payment Gateway: <span className="font-semibold">{addonModalPg ? 'Enable' : 'Disable'}</span>
                      <br />
                      PG Approval Help: <span className="font-semibold">{addonModalPgHelp ? 'Enable' : 'Disable'}</span>
                    </p>
                    <p className="text-xs text-amber-900/80">
                      Store owner will be notified of these changes.
                    </p>
                  </div>
                </>
              ) : addonUploadOpen ? (
                <>
                  <p className="text-sm text-gray-600">
                    {addonModalStore.name} ke liye integration details upload karein.
                  </p>

                  {addonModalPg ? (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">Gateway keys</p>
                      <input
                        type="text"
                        value={addonModalRazorpayKeyId}
                        onChange={(e) => setAddonModalRazorpayKeyId(e.target.value)}
                        placeholder="Razorpay Key ID"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="password"
                        value={addonModalRazorpaySecret}
                        onChange={(e) => setAddonModalRazorpaySecret(e.target.value)}
                        placeholder="Razorpay Key Secret"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}

                  {addonModalQr ? (
                    <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">QR image upload</p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setAddonModalQrFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    {addonModalStore.name} ke liye QR code aur Payment Gateway enable/disable karein.
                  </p>

                  <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span>QR Code</span>
                    <input
                      type="checkbox"
                      checked={addonModalQr}
                      onChange={(e) => setAddonModalQr(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span>Payment Gateway</span>
                    <input
                      type="checkbox"
                      checked={addonModalPg}
                      onChange={(e) => setAddonModalPg(e.target.checked)}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm">
                    <span>PG Approval Help</span>
                    <input
                      type="checkbox"
                      checked={addonModalPgHelp}
                      onChange={(e) => setAddonModalPgHelp(e.target.checked)}
                    />
                  </label>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end">
              {addonEnableConfirmOpen ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAddonEnableConfirmOpen(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmEnableAddons()}
                    disabled={addonModalSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {addonModalSaving ? 'Submitting...' : 'OK'}
                  </button>
                </>
              ) : addonUploadOpen ? (
                <>
                  <button
                    type="button"
                    onClick={closeAddonSelection}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveUploadStep()}
                    disabled={addonModalSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {addonModalSaving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeAddonSelection}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddonEnableConfirmOpen(true)}
                    disabled={addonModalSaving}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    OK
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Store Details</h2>
              <button
                onClick={() => setSelectedStore(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedStore.name}</h3>
                  <p className="text-gray-600">@{selectedStore.username}</p>
                  <p className="text-sm text-gray-500 mt-1">{selectedStore.businessType}</p>
                </div>
              </div>

              {selectedStore.description && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{selectedStore.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contact
                  </h4>
                  <div className="space-y-1 text-sm">
                    {selectedStore.phone && <p className="text-gray-600">Phone: {selectedStore.phone}</p>}
                    {selectedStore.whatsapp && <p className="text-green-600">WhatsApp: {selectedStore.whatsapp}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </h4>
                  <p className="text-gray-600 text-sm">{selectedStore.location}</p>
                </div>
              </div>

              {selectedStore.subscription ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Active Subscription
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Plan</span>
                      <span className="font-semibold text-gray-900">{selectedStore.subscription.plan.name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Price</span>
                      <span className="font-semibold text-gray-900">₹{selectedStore.subscription.price}/{selectedStore.subscription.plan.billingCycle}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Max Products</span>
                      <span className="font-semibold text-gray-900">{selectedStore.subscription.plan.maxProducts}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedStore.subscription.status)}`}>
                        {selectedStore.subscription.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Date
                      </span>
                      <span className="font-medium text-gray-900">{formatDate(selectedStore.subscription.startsAt)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        End Date
                      </span>
                      <span className="font-medium text-gray-900">{formatDate(selectedStore.subscription.endsAt)}</span>
                    </div>

                    {selectedStore.subscription.plan.features && selectedStore.subscription.plan.features.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <span className="text-sm font-semibold text-gray-900 mb-2 block">Features</span>
                        <ul className="space-y-1">
                          {selectedStore.subscription.plan.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedStore.subscription.status === 'active' && (
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleCancelSubscription(selectedStore.subscription!.id)}
                          disabled={subscriptionLoading}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {subscriptionLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Cancel Subscription
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                  <p className="text-gray-500">No active subscription</p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={`/store/${selectedStore.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[8rem] rounded-lg bg-primary px-4 py-2 text-center text-white transition hover:bg-primary-700"
                >
                  View store
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className="flex-1 min-w-[8rem] rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selectedStore)}
                  disabled={actionId === selectedStore.id}
                  className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 sm:w-auto sm:min-w-[10rem]"
                >
                  {actionId === selectedStore.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete store forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
