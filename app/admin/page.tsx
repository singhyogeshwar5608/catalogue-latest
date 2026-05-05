"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Crown,
  RefreshCcw,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
  Zap,
  DollarSign,
} from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';
import { getAdminDashboardStats } from '@/src/lib/api';
import type { AdminDashboardStats } from '@/types';

const REFRESH_INTERVAL_MS = 60_000;

const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      setIsRefreshing(!!stats);
      const data = await getAdminDashboardStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platformActivity = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'New stores this month',
        subtitle: `${stats.totals.monthlyNewStores} merchants onboarded`,
        icon: Store,
        accent: 'text-primary',
      },
      {
        title: 'Active boosts',
        subtitle: `${stats.totals.activeBoosts} boosts running now`,
        icon: Zap,
        accent: 'text-amber-600',
      },
      {
        title: 'Boost revenue (month)',
        subtitle: formatCurrency(stats.totals.monthlyBoostRevenue),
        icon: DollarSign,
        accent: 'text-emerald-600',
      },
    ];
  }, [stats]);

  const metricCards = useMemo(() => {
    if (!stats) return [];
    const {
      totalStores,
      activeStores,
      verifiedStores,
      boostedStores,
      totalBoosts,
      activeBoosts,
      monthlyNewStores,
      monthlyBoostRevenue,
    } = stats.totals;
    return [
      { title: 'Total Stores', value: totalStores, icon: Store, color: 'blue' as const },
      { title: 'Active Stores', value: activeStores, icon: ShieldCheck, color: 'green' as const },
      { title: 'Verified Stores', value: verifiedStores, icon: Crown, color: 'purple' as const },
      { title: 'Boosted Stores', value: boostedStores, icon: Zap, color: 'amber' as const },
      { title: 'Boosts Issued', value: totalBoosts, icon: BarChart3, color: 'cyan' as const },
      { title: 'Active Boosts', value: activeBoosts, icon: TrendingUp, color: 'red' as const },
      { title: 'New this Month', value: monthlyNewStores, icon: Users, color: 'indigo' as const },
      { title: 'Boost Revenue', value: formatCurrency(monthlyBoostRevenue), icon: DollarSign, color: 'emerald' as const },
    ];
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-6 rounded-3xl border border-slate-900/10 bg-white p-5 md:p-7">
        <div className="h-8 w-1/3 rounded-lg bg-slate-200/70 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-slate-900/10 bg-slate-100/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 rounded-3xl border border-slate-900/10 bg-gradient-to-br from-white via-white to-slate-900/[0.03] p-5 pb-16 md:p-7">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-900/10 bg-slate-900 text-white px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-300">Live platform health, boosts, and revenue telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="text-sm text-slate-300">Updated {formatTimeAgo(lastUpdated.toISOString())}</p>
          )}
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {metricCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {metricCards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Stores</h2>
                <p className="text-sm text-gray-500">Latest onboarded or reactivated shops with live status details</p>
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-900/10 px-3 py-1 rounded-full">
                {stats?.recentStores.length ?? 0} records
              </span>
            </div>
            {stats?.recentStores.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-gray-500">
                No recent stores found.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {stats?.recentStores.map((store) => (
                    <div key={store.id} className="rounded-xl border border-slate-900/10 bg-slate-900/[0.02] p-4">
                      <div className="flex items-start gap-3">
                        {store.logo ? (
                          <img src={store.logo} alt={store.name} className="h-11 w-11 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-500">
                            {store.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-gray-900">{store.name}</p>
                          <p className="truncate text-xs text-gray-500">{store.slug}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {store.category || 'Uncategorized'} · Joined {formatTimeAgo(store.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-2.5 py-1 ${store.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {store.is_verified ? 'Verified' : 'Pending'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${store.is_active ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-600'}`}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${store.is_boosted ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {store.is_boosted ? 'Boosted' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-900/10">
                  <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-4 bg-slate-900/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <span>Store</span>
                    <span>Category</span>
                    <span>Joined</span>
                    <span>Status</span>
                  </div>
                  {stats?.recentStores.map((store) => (
                    <div
                      key={store.id}
                      className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-4 border-t border-slate-900/10 bg-white px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {store.logo ? (
                          <img src={store.logo} alt={store.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                            {store.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{store.name}</p>
                          <p className="truncate text-xs text-gray-500">{store.slug}</p>
                        </div>
                      </div>
                      <p className="truncate text-sm text-gray-600">{store.category || 'Uncategorized'}</p>
                      <div>
                        <p className="text-sm text-gray-700">{formatTimeAgo(store.created_at)}</p>
                        <p className="text-xs text-gray-400">{formatDate(store.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-2.5 py-1 ${store.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {store.is_verified ? 'Verified' : 'Pending'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${store.is_active ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-600'}`}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${store.is_boosted ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {store.is_boosted ? 'Boosted' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Attention Needed</h2>
                <p className="text-sm text-gray-500">Inactivity, verification gaps, and boost expiry watchlist</p>
              </div>
            </div>
            {stats?.atRiskStores.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-gray-500">
                All stores look healthy right now.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {stats?.atRiskStores.map((store) => (
                    <div key={store.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{store.name}</p>
                          <p className="truncate text-xs text-gray-500">{store.slug}</p>
                        </div>
                        <span className={`text-xs font-semibold ${store.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                        <span className={`rounded-full px-2.5 py-1 ${store.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {store.is_verified ? 'Verified' : 'Verification Pending'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 ${store.is_active ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                          {store.is_active ? 'Store Active' : 'Store Inactive'}
                        </span>
                        {!store.is_active && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">High Risk</span>
                        )}
                        {!store.is_verified && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Needs Verification</span>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-gray-600">
                        Boost expiry: {store.boost_expiry_date ? formatDate(store.boost_expiry_date) : 'Not boosted'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-900/10">
                  <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)] gap-4 bg-slate-900/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                    <span>Store</span>
                    <span>Verification</span>
                    <span>Activity</span>
                    <span>Risk & Boost</span>
                  </div>
                  {stats?.atRiskStores.map((store) => (
                    <div
                      key={store.id}
                      className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.6fr)] items-center gap-4 border-t border-slate-900/10 bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{store.name}</p>
                        <p className="truncate text-xs text-gray-500">{store.slug}</p>
                      </div>

                      <div className="text-xs font-semibold">
                        <span className={`rounded-full px-2.5 py-1 ${store.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {store.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold">
                        <span className={`rounded-full px-2.5 py-1 ${store.is_active ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                          {store.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          {!store.is_active && (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">High Risk</span>
                          )}
                          {!store.is_verified && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Needs Verification</span>
                          )}
                          {store.is_active && store.is_verified && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Stable</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Boost expiry: {store.boost_expiry_date ? formatDate(store.boost_expiry_date) : 'Not boosted'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Plan Distribution</h2>
                <p className="text-sm text-gray-500">Boost utilization by tier</p>
              </div>
            </div>
            <div className="space-y-4">
              {stats?.planDistribution.map((plan) => {
                const utilization = plan.total_boosts
                  ? Math.round((plan.active_boosts / plan.total_boosts) * 100)
                  : 0;
                return (
                  <div key={plan.id}>
                    <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                      <span>{plan.name}</span>
                      <span>{formatCurrency(plan.price)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-slate-900 via-slate-800 to-primary transition-all"
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {plan.active_boosts} active · {plan.total_boosts} total boosts
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Recent Boosts</h2>
                <p className="text-sm text-gray-500">Latest activations & expirations</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {stats?.recentBoosts.map((boost) => (
                <div key={boost.id} className="rounded-xl border border-slate-900/10 bg-slate-900/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{boost.store_name ?? 'Unknown store'}</p>
                      <p className="text-xs text-gray-500">Plan · {boost.plan_name ?? '—'}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        boost.status === 'active'
                          ? 'text-emerald-600'
                          : boost.status === 'pending'
                          ? 'text-amber-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {boost.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>{formatCurrency(boost.price)}</span>
                    <span>Ends {formatDate(boost.ends_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-900/10 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Platform Activity</h2>
            <p className="text-sm text-gray-500">Signals generated from real-time metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platformActivity.map((activity) => (
            <div key={activity.title} className="rounded-2xl border border-slate-900/10 bg-slate-900/[0.02] p-4">
              <activity.icon className={`h-5 w-5 ${activity.accent}`} />
              <p className="mt-3 text-sm text-gray-500">{activity.subtitle}</p>
              <p className="text-lg font-semibold text-gray-900">{activity.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
