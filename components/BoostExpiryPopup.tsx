"use client";

import { X, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface BoostExpiryPopupProps {
  boostPlanName: string;
  isExpired: boolean;
  daysRemaining?: number;
  onClose: () => void;
}

export default function BoostExpiryPopup({ boostPlanName, isExpired, daysRemaining, onClose }: BoostExpiryPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className={`p-6 ${isExpired ? 'bg-red-50' : 'bg-orange-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${isExpired ? 'bg-red-100' : 'bg-orange-100'}`}>
                <Zap className={`w-6 h-6 ${isExpired ? 'text-red-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isExpired ? 'Boost Plan Expired' : 'Boost Expiring Soon'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {isExpired 
                    ? 'Your boost has expired' 
                    : `${daysRemaining} day${daysRemaining && daysRemaining > 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
            <p className="text-sm text-gray-600 mb-2">Boost Plan</p>
            <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600" />
              {boostPlanName}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">
              {isExpired 
                ? 'Your boost plan has expired. Reactivate now to regain premium visibility and priority placement.'
                : 'Your boost is expiring soon. Renew to maintain your competitive edge.'}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-gray-900 mb-3">{`What you're missing:`}</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">⚡</span>
                  <span>Priority placement in search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">⚡</span>
                  <span>Featured badge on your store</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">⚡</span>
                  <span>Higher visibility to customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">⚡</span>
                  <span>Increased traffic and sales</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Later
            </button>
            <Link
              href="/dashboard/boost"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition font-semibold flex items-center justify-center gap-2"
            >
              {isExpired ? 'Reactivate' : 'Renew'} Boost
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
