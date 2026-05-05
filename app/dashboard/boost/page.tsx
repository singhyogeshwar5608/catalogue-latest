"use client";

import { useEffect, useState } from 'react';
import { Check, Zap, Calendar, Loader2, X } from 'lucide-react';
import {
  getBoostPlans,
  getStoreBoostOverview,
  activateStoreBoost,
  cancelBoost,
  getStoredUser,
  getStoreBySlugFromApi,
} from '@/src/lib/api';
import type { BoostPlan, StoreBoost } from '@/types';

export default function BoostPage() {
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [activeBoost, setActiveBoost] = useState<StoreBoost | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [cancellingBoostId, setCancellingBoostId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const user = getStoredUser();
        const fetchedPlans = await getBoostPlans();
        setPlans(fetchedPlans);

        if (!user?.storeSlug) {
          return;
        }

        const store = await getStoreBySlugFromApi(user.storeSlug);
        if (!store) {
  return;
        }

        setStoreId(store.id);
        const overview = await getStoreBoostOverview(store.id);
        setActiveBoost(overview.activeBoost);
      } catch (err) {
        setErrorMessage('Failed to load boost data.');
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, []);

  const handleActivate = async (plan: BoostPlan) => {
    if (!storeId) return;
    setLoadingPlanId(plan.id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const boost = await activateStoreBoost(storeId, { planId: plan.id });
      setActiveBoost(boost);
      setSuccessMessage(`✅ Boost activated! Your store is now featured for ${plan.days} days.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to activate boost.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  const handleCancel = async () => {
    if (!activeBoost) return;
    setCancellingBoostId(activeBoost.id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await cancelBoost(activeBoost.id);
      setActiveBoost(null);
      setSuccessMessage('Boost cancelled successfully.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to cancel boost.');
    } finally {
      setCancellingBoostId(null);
    }
  };

  const boostSteps = [
    { number: '01', title: 'Choose a Plan', description: 'Pick the boost duration and budget that aligns with your goals.', badgeBg: 'bg-blue-100 text-blue-700', gradient: 'from-blue-50 to-white' },
    { number: '02', title: 'Get Featured', description: 'Your store instantly jumps to the sponsored spotlight across the platform.', badgeBg: 'bg-purple-100 text-purple-700', gradient: 'from-purple-50 to-white' },
    { number: '03', title: 'Increase Sales', description: 'Reach more shoppers, drive traffic, and convert new customers daily.', badgeBg: 'bg-amber-100 text-amber-700', gradient: 'from-amber-50 to-white' },
  ];

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Boost Your Store</h1>
        <p className="text-sm md:text-base text-gray-600">Increase visibility and get featured on homepage</p>
      </div>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 font-medium text-sm">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm">
          {errorMessage}
        </div>
      )}

      {activeBoost && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Active Boost — {activeBoost.plan.name}</h2>
                <p className="text-sm text-gray-600">Your store is currently featured on homepage</p>
                <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>Expires: {new Date(activeBoost.endsAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={cancellingBoostId === activeBoost.id}
              className="flex items-center gap-1 text-xs text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition disabled:opacity-50"
            >
              {cancellingBoostId === activeBoost.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 md:p-6 text-white">
              <h3 className="text-xl md:text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold">₹{plan.price}</span>
                <span className="text-sm text-primary-100">{plan.days} days</span>
              </div>
            </div>
            <div className="p-4 md:p-6">
              {plan.features && (
                <ul className="space-y-2 mb-4 md:mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => handleActivate(plan)}
                disabled={loadingPlanId === plan.id}
                className="w-full py-2.5 md:py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loadingPlanId === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Activating...
                  </>
                ) : (
                  'Activate Boost'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Growth Journey</p>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">How Boost Works</h2>
          </div>
          <span className="hidden md:inline-flex text-xs text-gray-500">3 simple steps • under 2 minutes</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {boostSteps.map((step) => (
            <div key={step.number} className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${step.gradient} p-4 shadow-sm`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step.badgeBg}`}>{step.number}</div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500">Step {step.number}</p>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                </div>
              </div>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
