"use client";

import { useEffect, useState } from 'react';
import { Edit, Plus, Trash2, Loader2, Check, X } from 'lucide-react';
import {
  getAllSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  getAdminFreeTrialDays,
  updateAdminFreeTrialDays,
  getAdminSubscriptionAddonCharges,
  updateAdminSubscriptionAddonCharges,
  getAdminSubscriptionBillingDiscounts,
  updateAdminSubscriptionBillingDiscounts,
  isApiError,
  parseApiValidationErrors,
} from '@/src/lib/api';
import type { SubscriptionPlan } from '@/types';

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [freeTrialDays, setFreeTrialDays] = useState<number | null>(null);
  const [trialInput, setTrialInput] = useState<string>('');
  const [trialLoading, setTrialLoading] = useState(true);
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialMessage, setTrialMessage] = useState<string | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [addonPg, setAddonPg] = useState<string>('');
  const [addonQr, setAddonQr] = useState<string>('');
  const [addonHelp, setAddonHelp] = useState<string>('');
  const [addonLoading, setAddonLoading] = useState(true);
  const [addonSaving, setAddonSaving] = useState(false);
  const [addonMessage, setAddonMessage] = useState<string | null>(null);
  const [addonError, setAddonError] = useState<string | null>(null);
  const [disc1m, setDisc1m] = useState<string>('');
  const [disc3m, setDisc3m] = useState<string>('');
  const [disc1y, setDisc1y] = useState<string>('');
  const [discLoading, setDiscLoading] = useState(true);
  const [discSaving, setDiscSaving] = useState(false);
  const [discMessage, setDiscMessage] = useState<string | null>(null);
  const [discAudit, setDiscAudit] = useState<string | null>(null);
  const [discError, setDiscError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const fetchedPlans = await getAllSubscriptionPlans();
      setPlans(fetchedPlans);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setTrialLoading(true);
        setTrialError(null);
        const days = await getAdminFreeTrialDays();
        if (!cancelled) {
          setFreeTrialDays(days);
          setTrialInput(String(days));
        }
      } catch (e) {
        if (!cancelled) {
          setTrialError(e instanceof Error ? e.message : 'Could not load free trial settings');
        }
      } finally {
        if (!cancelled) setTrialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setAddonLoading(true);
        setAddonError(null);
        const c = await getAdminSubscriptionAddonCharges();
        if (!cancelled) {
          setAddonPg(String(c.payment_gateway_integration_inr));
          setAddonQr(String(c.qr_code_inr));
          setAddonHelp(String(c.payment_gateway_help_inr));
        }
      } catch (e) {
        if (!cancelled) {
          setAddonError(e instanceof Error ? e.message : 'Could not load add-on charges');
        }
      } finally {
        if (!cancelled) setAddonLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDiscLoading(true);
        setDiscError(null);
        setDiscAudit(null);
        const d = await getAdminSubscriptionBillingDiscounts();
        if (!cancelled) {
          setDisc1m(String(d.discount_1_month_pct));
          setDisc3m(String(d.discount_3_months_pct));
          setDisc1y(String(d.discount_1_year_pct));
        }
      } catch (e) {
        if (!cancelled) {
          setDiscError(e instanceof Error ? e.message : 'Could not load billing discounts');
        }
      } finally {
        if (!cancelled) setDiscLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parseNonNegativeInt = (s: string): number | null => {
    const t = s.trim();
    if (t === '') return null;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0 || n > 99_999_999) return null;
    return n;
  };

  const handleSaveAddons = async () => {
    const pg = parseNonNegativeInt(addonPg);
    const qr = parseNonNegativeInt(addonQr);
    const help = parseNonNegativeInt(addonHelp);
    if (pg === null || qr === null || help === null) {
      setAddonMessage(null);
      setAddonError('Enter whole rupee amounts from 0 to 99,999,999 for each field.');
      return;
    }
    try {
      setAddonSaving(true);
      setAddonError(null);
      setAddonMessage(null);
      const saved = await updateAdminSubscriptionAddonCharges({
        payment_gateway_integration_inr: pg,
        qr_code_inr: qr,
        payment_gateway_help_inr: help,
      });
      setAddonPg(String(saved.payment_gateway_integration_inr));
      setAddonQr(String(saved.qr_code_inr));
      setAddonHelp(String(saved.payment_gateway_help_inr));
      setAddonMessage('Saved. These amounts apply when merchants enable the matching options at checkout.');
    } catch (e) {
      setAddonError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setAddonSaving(false);
    }
  };

  const parsePercent0to100 = (s: string): number | null => {
    const t = s.trim();
    if (t === '') return null;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
  };

  const handleSaveBillingDiscounts = async () => {
    const a = parsePercent0to100(disc1m);
    const b = parsePercent0to100(disc3m);
    const c = parsePercent0to100(disc1y);
    if (a === null || b === null || c === null) {
      setDiscMessage(null);
      setDiscAudit(null);
      setDiscError('Enter a whole percent from 0 to 100 for each term.');
      return;
    }
    try {
      setDiscSaving(true);
      setDiscError(null);
      setDiscMessage(null);
      setDiscAudit(null);
      const saved = await updateAdminSubscriptionBillingDiscounts({
        discount_1_month_pct: a,
        discount_3_months_pct: b,
        discount_1_year_pct: c,
      });
      setDisc1m(String(saved.discount_1_month_pct));
      setDisc3m(String(saved.discount_3_months_pct));
      setDisc1y(String(saved.discount_1_year_pct));
      setDiscMessage(
        `Saved: 1 mo ${saved.discount_1_month_pct}%, 3 mo ${saved.discount_3_months_pct}%, 1 yr ${saved.discount_1_year_pct}%. Compare the box below with phpMyAdmin (same DB name + row values).`
      );
      if (saved._laravel_database != null || saved._persisted_rows != null) {
        setDiscAudit(
          JSON.stringify(
            { laravel_database: saved._laravel_database, platform_settings_rows: saved._persisted_rows },
            null,
            2
          )
        );
      }
    } catch (e) {
      setDiscError(e instanceof Error ? e.message : 'Save failed');
      setDiscAudit(null);
    } finally {
      setDiscSaving(false);
    }
  };

  const handleSaveFreeTrial = async () => {
    const parsed = parseInt(trialInput, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
      setTrialMessage(null);
      setTrialError('Enter a whole number between 1 and 365.');
      return;
    }
    try {
      setTrialSaving(true);
      setTrialError(null);
      setTrialMessage(null);
      const saved = await updateAdminFreeTrialDays(parsed);
      setFreeTrialDays(saved);
      setTrialInput(String(saved));
      setTrialMessage('Saved. New stores will use this trial length.');
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setTrialSaving(false);
    }
  };

  const formatPlanSaveError = (err: unknown, fallback: string) => {
    if (isApiError(err) && err.payload) {
      const ve = parseApiValidationErrors(err.payload);
      if (ve) {
        const lines = Object.entries(ve).flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`));
        if (lines.length) return `${fallback}\n\n${lines.join('\n')}`;
      }
    }
    return err instanceof Error ? err.message : fallback;
  };

  const handleCreatePlan = async (formData: any) => {
    try {
      await createSubscriptionPlan(formData);
      await fetchPlans();
      setShowCreateModal(false);
    } catch (err) {
      alert(formatPlanSaveError(err, 'Failed to create plan'));
    }
  };

  const handleUpdatePlan = async (planId: string, formData: any) => {
    try {
      await updateSubscriptionPlan(planId, formData);
      await fetchPlans();
      setEditingPlan(null);
    } catch (err) {
      alert(formatPlanSaveError(err, 'Failed to update plan'));
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      setDeletingPlanId(planId);
      await deleteSubscriptionPlan(planId);
      await fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete plan');
    } finally {
      setDeletingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
          <p className="text-gray-600">Manage pricing and features</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Free trial (all new stores)</h2>
        <p className="mt-1 text-sm text-gray-600">
          How many days each merchant gets before they must subscribe. Saved in the database; applies to stores created
          after you save (existing stores keep their current trial end date).
        </p>
        {trialLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading setting…
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 max-w-xs">
              <label htmlFor="free-trial-days" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Trial length (days)
              </label>
              <input
                id="free-trial-days"
                type="number"
                min={1}
                max={365}
                value={trialInput}
                onChange={(e) => setTrialInput(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-500">
                Current saved value: {freeTrialDays != null ? `${freeTrialDays} days` : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveFreeTrial}
              disabled={trialSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {trialSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save trial length
            </button>
          </div>
        )}
        {trialError && (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {trialError}
          </p>
        )}
        {trialMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
            {trialMessage}
          </p>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Subscription add-ons (global charges, ₹)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set how much extra to charge when a merchant opts for payment gateway integration, a QR code setup, or
          company-assisted payment gateway integration. Values are stored in the database and can be used at checkout
          when those options are toggled on.
        </p>
        {addonLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading charges…
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="addon-pg" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment gateway integration
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="text-sm text-gray-500">₹</span>
                <input
                  id="addon-pg"
                  type="number"
                  min={0}
                  max={99_999_999}
                  value={addonPg}
                  onChange={(e) => setAddonPg(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
              </div>
            </div>
            <div>
              <label htmlFor="addon-qr" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                QR code
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="text-sm text-gray-500">₹</span>
                <input
                  id="addon-qr"
                  type="number"
                  min={0}
                  max={99_999_999}
                  value={addonQr}
                  onChange={(e) => setAddonQr(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
              </div>
            </div>
            <div>
              <label htmlFor="addon-help" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Payment gateway help (by company)
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <span className="text-sm text-gray-500">₹</span>
                <input
                  id="addon-help"
                  type="number"
                  min={0}
                  max={99_999_999}
                  value={addonHelp}
                  onChange={(e) => setAddonHelp(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        )}
        {!addonLoading && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSaveAddons}
              disabled={addonSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {addonSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save add-on charges
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Network: <code className="rounded bg-slate-100 px-1">PUT …/admin/settings/subscription-addons</code> — only
              the three ₹ fields above (not billing % discounts).
            </p>
          </div>
        )}
        {addonError && (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {addonError}
          </p>
        )}
        {addonMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
            {addonMessage}
          </p>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Billing-term discounts (% off)</h2>
        <p className="mt-1 text-sm text-gray-600">
          Set how much discount applies when a merchant pays for a one-month, three-month, or one-year subscription term.
          Each value is a percent from 0–100. Rows are stored in the same <code className="text-xs">platform_settings</code>{' '}
          table as the free trial and add-on prices, using keys{' '}
          <code className="text-xs">subscription_billing_discount_1_month_pct</code>,{' '}
          <code className="text-xs">subscription_billing_discount_3_months_pct</code>,{' '}
          <code className="text-xs">subscription_billing_discount_1_year_pct</code>.
        </p>
        {discLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading discounts…
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="disc-1m" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                1 month
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <input
                  id="disc-1m"
                  type="number"
                  min={0}
                  max={100}
                  value={disc1m}
                  onChange={(e) => setDisc1m(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label htmlFor="disc-3m" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                3 months
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <input
                  id="disc-3m"
                  type="number"
                  min={0}
                  max={100}
                  value={disc3m}
                  onChange={(e) => setDisc3m(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label htmlFor="disc-1y" className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                1 year
              </label>
              <div className="mt-1.5 flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
                <input
                  id="disc-1y"
                  type="number"
                  min={0}
                  max={100}
                  value={disc1y}
                  onChange={(e) => setDisc1y(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-gray-900 outline-none focus:ring-0"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
          </div>
        )}
        {!discLoading && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleSaveBillingDiscounts}
              disabled={discSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {discSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save billing discounts
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Network: <code className="rounded bg-slate-100 px-1">POST …/admin/settings/subscription-billing-discounts</code>{' '}
              — response <code className="rounded bg-slate-100 px-1">data</code> will show{' '}
              <code className="rounded bg-slate-100 px-1">discount_1_month_pct</code> etc. (separate from add-on ₹).
            </p>
          </div>
        )}
        {discError && (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {discError}
          </p>
        )}
        {discMessage && (
          <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
            {discMessage}
          </p>
        )}
        {discAudit && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-snug text-slate-800">
            {discAudit}
          </pre>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-md overflow-hidden">
            {plan.isPopular && (
              <div className="bg-primary text-white text-center py-2 text-sm font-semibold">
                MOST POPULAR
              </div>
            )}
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 capitalize">{plan.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Order: <span className="font-semibold text-gray-700">{plan.displayOrder ?? '—'}</span>
                  </p>
                </div>
                {!plan.isActive && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
              </div>

              <div className="mb-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {plan.durationDays ? `${plan.durationDays} days` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Max Products</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {plan.maxProducts >= 999999 ? 'Unlimited' : plan.maxProducts}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Features ({plan.features.length})</p>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="text-xs text-gray-700">• {feature}</li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-xs text-gray-500">+ {plan.features.length - 3} more</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingPlan(plan)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  disabled={deletingPlanId === plan.id}
                  className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                >
                  {deletingPlanId === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <PlanModal
          plan={null}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreatePlan}
        />
      )}

      {editingPlan && (
        <PlanModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={(formData) => handleUpdatePlan(editingPlan.id, formData)}
        />
      )}
    </div>
  );
}

function PlanModal({ plan, onClose, onSave }: { plan: SubscriptionPlan | null; onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    price: plan != null ? String(plan.price) : '',
    billing_cycle: plan?.billingCycle === 'yearly' ? 'yearly' : 'monthly',
    duration_days: plan?.durationDays || 30,
    billing_discount_tier: plan?.billingDiscountTier ?? '',
    display_order: plan?.displayOrder ?? '',
    max_products: plan?.maxProducts || 10,
    is_popular: plan?.isPopular || false,
    is_active: plan?.isActive !== false,
    features: plan?.features?.join('\n') || '',
    description: plan?.description || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceParsed = parseInt(String(formData.price).trim(), 10);
    if (!Number.isFinite(priceParsed) || priceParsed < 0) {
      alert('Please enter a valid price in ₹ (0 or more).');
      return;
    }
    const orderRaw = String(formData.display_order).trim();
    const displayOrder =
      orderRaw === '' ? null : (() => {
        const n = parseInt(orderRaw, 10);
        return Number.isFinite(n) && n >= 1 && n <= 9999 ? n : NaN;
      })();
    if (displayOrder !== null && !Number.isFinite(displayOrder)) {
      alert('Please enter a valid display order number (1 to 9999), or leave blank.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...formData,
        price: priceParsed,
        billing_discount_tier: formData.billing_discount_tier || null,
        display_order: displayOrder,
        features: formData.features.split('\n').filter((f) => f.trim()),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {plan ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                min="0"
                placeholder="Enter amount"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display order (1–9999)</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                min="1"
                max="9999"
                placeholder="e.g., 1"
              />
              <p className="mt-1 text-xs text-gray-500">Plans sort ascending by this number across admin + subscription.</p>
            </div>
            <div />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing cycle</label>
              <select
                value={formData.billing_cycle}
                onChange={(e) =>
                  setFormData({ ...formData, billing_cycle: e.target.value as 'monthly' | 'yearly' })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">How this plan is billed (monthly vs yearly).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
              <input
                type="number"
                value={formData.duration_days}
                onChange={(e) => setFormData({ ...formData, duration_days: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                min="1"
                max="365"
                placeholder="e.g., 7 for trial, 30 for monthly"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Checkout billing discount</label>
            <select
              value={formData.billing_discount_tier}
              onChange={(e) =>
                setFormData({ ...formData, billing_discount_tier: e.target.value })
              }
              className="w-full max-w-xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="">Auto (from duration:1–59 days → 1 mo, 60–329 → 3 mo, 330+ or yearly → 1 yr)</option>
              <option value="one_month">Force 1-month % (platform setting)</option>
              <option value="three_months">Force 3-month %</option>
              <option value="one_year">Force 1-year %</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Merchants see this % in the subscription confirmation popup. Use <strong>Auto</strong> only if duration
              matches the term (e.g. 90 days for a quarterly plan). If every plan uses 30-day duration, pick the matching
              force option so 5% / 10% discounts apply.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Products</label>
            <input
              type="number"
              value={formData.max_products}
              onChange={(e) => setFormData({ ...formData, max_products: Number(e.target.value) })}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={6}
              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_popular}
                onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {plan ? 'Update' : 'Create'} Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
