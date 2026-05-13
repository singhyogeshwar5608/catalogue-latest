"use client";

import { X, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SubscriptionExpiryPopupProps {
  planName: string;
  daysRemaining: number;
  onClose: () => void;
}

export default function SubscriptionExpiryPopup({ planName, daysRemaining, onClose }: SubscriptionExpiryPopupProps) {
  // `< 0` only: `0` can mean "last partial day" when whole days use floor (aligned with trial banner).
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 7;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-black/25">
        <div className={`p-3.5 ${isExpired ? 'bg-red-50' : 'bg-emerald-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-full p-1.5 ${isExpired ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                <AlertCircle className={`h-4 w-4 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`} />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  {isExpired ? 'Subscription Expired' : 'Subscription Expiring Soon'}
                </h3>
                <div className="mt-1 flex">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-md ring-1 ring-white/20 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    {isExpired
                      ? 'Subscription Expired'
                      : daysRemaining === 0
                        ? 'Less than 1 day remaining'
                        : `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining`}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 transition hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5 p-3.5">
          <div className="rounded-lg border border-slate-900 bg-slate-900 p-2.5 shadow-md">
            <p className="mb-1 text-[9px] text-slate-300">Current Plan</p>
            <p className="text-[12px] font-bold text-white">{planName}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] leading-snug text-slate-700">
              {isExpired
                ? 'Your subscription has expired. Upgrade now to continue enjoying premium features and keep your store active.'
                : 'Your subscription is expiring soon. Upgrade or renew to avoid interruption of services.'}
            </p>

            <ul className="space-y-1.5 text-[9px] leading-snug text-slate-600">
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>•</span>
                <span>Access to premium features will be restricted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>•</span>
                <span>Your store visibility may be reduced</span>
              </li>
              <li className="flex items-start gap-2">
                <span className={`mt-0.5 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>•</span>
                <span>Product limits will be enforced</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-2 pt-1.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Later
            </button>
            <Link
              href="/dashboard/subscription"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition ${
                isExpired ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              Upgrade Now
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
