"use client";

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Loader2, RefreshCcw, Zap, IndianRupee, TrendingUp, PlusCircle, ToggleLeft, ToggleRight, Edit3, Trash2 } from 'lucide-react';
import { cancelBoost, getStoreBoosts, getAllBoostPlans, createBoostPlan, updateBoostPlan, deleteBoostPlan } from '@/src/lib/api';
import type { BoostPlan, StoreBoost } from '@/types';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const calcDaysLeft = (endsAt: string) => {
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_IN_MS));
};

export default function AdminBoostsPage() {
  const [boosts, setBoosts] = useState<StoreBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planActionId, setPlanActionId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    days: '',
    priorityWeight: '1',
    badgeLabel: 'Boost',
    badgeColor: '#f97316',
    features: '',
  });
  const [editPlan, setEditPlan] = useState<BoostPlan | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    days: '',
    priorityWeight: '1',
    badgeLabel: 'Boost',
    badgeColor: '#f97316',
    features: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [planDeletingId, setPlanDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (payload: { type: 'success' | 'error'; text: string }) => {
    setMessage(payload);
    if (payload.type === 'success') {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handlePlanInputChange = (field: keyof typeof planForm, value: string) => {
    setPlanForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditInputChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetCreateForm = () => {
    setPlanForm({
      name: '',
      price: '',
      days: '',
      priorityWeight: '1',
      badgeLabel: 'Boost',
      badgeColor: '#f97316',
      features: '',
    });
  };

  const handleCreatePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planForm.name || !planForm.price || !planForm.days) {
      showMessage({ type: 'error', text: 'Name, price, and duration are required.' });
      return;
    }

    setPlanSubmitting(true);
    try {
      const newPlan = await createBoostPlan({
        name: planForm.name.trim(),
        price: Number(planForm.price),
        days: Number(planForm.days),
        priority_weight: Number(planForm.priorityWeight || '1'),
        badge_label: planForm.badgeLabel.trim() || 'Boost',
        badge_color: planForm.badgeColor || '#f97316',
        is_active: true,
        features: planForm.features
          .split('\n')
          .map((feature) => feature.trim())
          .filter(Boolean),
      });
      setPlans((prev) => [newPlan, ...prev]);
      showMessage({ type: 'success', text: 'Boost plan created successfully.' });
      resetCreateForm();
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create boost plan.' });
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleTogglePlanStatus = async (plan: BoostPlan) => {
    try {
      setPlanActionId(plan.id);
      const updated = await updateBoostPlan(plan.id, { is_active: !plan.isActive });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
      showMessage({
        type: 'success',
        text: `Plan ${updated.isActive ? 'activated' : 'paused'} successfully.`,
      });
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update plan.' });
    } finally {
      setPlanActionId(null);
    }
  };

  const openEditModal = (plan: BoostPlan) => {
    setEditPlan(plan);
    setEditForm({
      name: plan.name,
      price: String(plan.price),
      days: String(plan.days),
      priorityWeight: String(plan.priorityWeight),
      badgeLabel: plan.badgeLabel,
      badgeColor: plan.badgeColor ?? '#f97316',
      features: (plan.features ?? []).join('\n'),
    });
  };

  const handleUpdatePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editPlan) return;
    setEditSubmitting(true);
    try {
      const updated = await updateBoostPlan(editPlan.id, {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        days: Number(editForm.days),
        priority_weight: Number(editForm.priorityWeight || '1'),
        badge_label: editForm.badgeLabel.trim() || 'Boost',
        badge_color: editForm.badgeColor || '#f97316',
        features: editForm.features
          .split('\n')
          .map((feature) => feature.trim())
          .filter(Boolean),
      });
      setPlans((prev) => prev.map((plan) => (plan.id === updated.id ? updated : plan)));
      showMessage({ type: 'success', text: 'Boost plan updated successfully.' });
      setEditPlan(null);
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update boost plan.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeletePlan = async (plan: BoostPlan) => {
    const confirmed = window.confirm(`Delete boost plan "${plan.name}" permanently?`);
    if (!confirmed) return;
    try {
      setPlanDeletingId(plan.id);
      await deleteBoostPlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      showMessage({ type: 'success', text: 'Boost plan deleted.' });
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete boost plan.' });
    } finally {
      setPlanDeletingId(null);
    }
  };

  const fetchBoosts = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await getStoreBoosts();
      setBoosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch boosts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const data = await getAllBoostPlans();
      setPlans(data);
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Unable to fetch boost plans' });
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    fetchBoosts();
    fetchPlans();
  }, []);

  const handleCancel = async (boostId: string) => {
    try {
      setCancellingId(boostId);
      await cancelBoost(boostId);
      setBoosts((prev) => prev.map((boost) => (boost.id === boostId ? { ...boost, status: 'cancelled', endsAt: new Date().toISOString() } : boost)));
      showMessage({ type: 'success', text: 'Boost cancelled successfully.' });
    } catch (err) {
      showMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel boost' });
    } finally {
      setCancellingId(null);
      fetchBoosts();
    }
  };

  const { activeBoosts, cancelledBoosts, totalRevenue, avgDuration, planUsage } = useMemo(() => {
    if (!boosts.length) {
      return { activeBoosts: [], cancelledBoosts: [], totalRevenue: 0, avgDuration: 0, planUsage: {} as Record<string, number> };
    }
    const active = boosts.filter((boost) => boost.status === 'active');
    const cancelled = boosts.filter((boost) => boost.status === 'cancelled');
    const revenue = active.reduce((sum, boost) => sum + boost.plan.price, 0);
    const avg = active.length
      ? Math.round(
          active.reduce((sum, boost) => sum + (new Date(boost.endsAt).getTime() - new Date(boost.startsAt).getTime()), 0) /
            active.length /
            DAY_IN_MS
        )
      : 0;
    const planCounts = boosts.reduce<Record<string, number>>((acc, boost) => {
      acc[boost.plan.name] = (acc[boost.plan.name] || 0) + 1;
      return acc;
    }, {});
    return { activeBoosts: active, cancelledBoosts: cancelled, totalRevenue: revenue, avgDuration: avg, planUsage: planCounts };
  }, [boosts]);
  const planUsageEntries = Object.entries(planUsage);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-gray-600 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Loading boost data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Active Boosts</h1>
          <p className="text-gray-600">Monitor and manage every sponsored store placement</p>
        </div>
        <button
          onClick={fetchBoosts}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            message?.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          {message?.text ?? error}
        </div>
      )}

      {!boosts.length && !loading && !error && !message && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <p className="text-lg font-semibold text-gray-700">No boost campaigns yet</p>
          <p className="text-sm">Once stores purchase boost plans, they will appear here for monitoring.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Active Boosts
          </h3>
          <p className="text-3xl font-bold text-gray-900">{activeBoosts.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" /> Estimated Revenue
          </h3>
          <p className="text-3xl font-bold text-gray-900">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" /> Avg. Boost Duration
          </h3>
          <p className="text-3xl font-bold text-gray-900">{avgDuration || 0} days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Boost Plan</h2>
              <p className="text-xs text-gray-500">New plans instantly appear in store dashboards.</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={handleCreatePlan}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600">Plan Name</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => handlePlanInputChange('name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Gold Boost"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={planForm.price}
                  onChange={(e) => handlePlanInputChange('price', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="499"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={planForm.days}
                  onChange={(e) => handlePlanInputChange('days', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="7"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Priority Weight</label>
                <input
                  type="number"
                  min="1"
                  value={planForm.priorityWeight}
                  onChange={(e) => handlePlanInputChange('priorityWeight', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Label</label>
                <input
                  type="text"
                  value={planForm.badgeLabel}
                  onChange={(e) => handlePlanInputChange('badgeLabel', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Badge Color</label>
                <input
                  type="color"
                  value={planForm.badgeColor}
                  onChange={(e) => handlePlanInputChange('badgeColor', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1 h-10 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Features (one per line)</label>
              <textarea
                value={planForm.features}
                onChange={(e) => handlePlanInputChange('features', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                rows={4}
                placeholder="Homepage spotlight\nPriority listing"
              />
            </div>
            <button
              type="submit"
              disabled={planSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
            >
              {planSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              {planSubmitting ? 'Creating...' : 'Create Plan'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All Boost Plans</h2>
              <p className="text-xs text-gray-500">Toggle availability for store owners.</p>
            </div>
            {plansLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-gray-500">No boost plans yet. Create one to get started.</p>
          ) : (
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{plan.days} days</p>
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    </div>
                    <span className="text-xl font-bold text-gray-900">₹{plan.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Priority {plan.priorityWeight}</span>
                    <span className="flex items-center gap-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: plan.badgeColor || '#f97316' }}
                      ></span>
                      {plan.badgeLabel || 'Boost'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <span className={`text-xs font-semibold ${plan.isActive ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {plan.isActive ? 'Visible to stores' : 'Hidden from stores'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePlanStatus(plan)}
                        disabled={planActionId === plan.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {planActionId === plan.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : plan.isActive ? (
                          <>
                            <ToggleLeft className="w-4 h-4" /> Pause
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4" /> Activate
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(plan)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(plan)}
                        disabled={planDeletingId === plan.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        {planDeletingId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {boosts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {boosts.map((boost) => {
                  const store = boost.store;
                  const daysLeft = calcDaysLeft(boost.endsAt);
                  const statusColor =
                    boost.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700'
                      : boost.status === 'cancelled'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-gray-100 text-gray-600';
                  const badgeColor =
                    daysLeft > 7 ? 'bg-green-100 text-green-800' : daysLeft > 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';

                  return (
                    <tr key={boost.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {store?.logo && <img src={store.logo} alt={store?.name ?? 'Store'} className="w-10 h-10 rounded-full object-cover" />}
                          <div>
                            <div className="font-medium text-gray-900">{store?.name ?? 'Store #' + boost.storeId}</div>
                            {store?.username && <div className="text-sm text-gray-500">@{store.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                          {boost.plan.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(boost.startsAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(boost.endsAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badgeColor}`}>{daysLeft} days</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1 ${statusColor}`}>
                          <Zap className="w-3 h-3" />
                          {boost.status.charAt(0).toUpperCase() + boost.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={boost.status !== 'active' || cancellingId === boost.id}
                          onClick={() => handleCancel(boost.id)}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1 ml-auto disabled:opacity-50 disabled:cursor-not-allowed justify-end"
                        >
                          {cancellingId === boost.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Boost Pipeline</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Active placements</span>
              <span className="font-semibold text-gray-900">{activeBoosts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cancelled this week</span>
              <span className="font-semibold text-rose-600">{cancelledBoosts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total stores boosted</span>
              <span className="font-semibold text-primary">{new Set(boosts.map((boost) => boost.storeId)).size}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <div className="space-y-3 text-sm">
            {planUsageEntries.length === 0 && <p className="text-gray-500">No boost plans yet.</p>}
            {planUsageEntries.map(([planName, count]) => (
              <div key={planName} className="flex items-center justify-between">
                <span className="text-gray-600">{planName}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Boost Plan</h3>
                <p className="text-sm text-gray-500">Updating: {editPlan.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditPlan(null)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleUpdatePlan}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Plan Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleEditInputChange('name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => handleEditInputChange('price', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Duration (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.days}
                    onChange={(e) => handleEditInputChange('days', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Priority Weight</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.priorityWeight}
                    onChange={(e) => handleEditInputChange('priorityWeight', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Badge Label</label>
                  <input
                    type="text"
                    value={editForm.badgeLabel}
                    onChange={(e) => handleEditInputChange('badgeLabel', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Badge Color</label>
                  <input
                    type="color"
                    value={editForm.badgeColor}
                    onChange={(e) => handleEditInputChange('badgeColor', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-1 h-10 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Features (one per line)</label>
                <textarea
                  value={editForm.features}
                  onChange={(e) => handleEditInputChange('features', e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditPlan(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
