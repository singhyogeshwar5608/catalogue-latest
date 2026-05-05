"use client";

import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ProductLimitPopupProps {
  currentProducts: number;
  maxProducts: number;
  planName: string;
  onClose: () => void;
}

export default function ProductLimitPopup({ currentProducts, maxProducts, planName, onClose }: ProductLimitPopupProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-6 bg-orange-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Product Limit Reached</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {currentProducts} / {maxProducts} products
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
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Current Plan</p>
            <p className="text-lg font-bold text-gray-900">{planName}</p>
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Products Used</span>
                <span className="font-semibold text-gray-900">{currentProducts} / {maxProducts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((currentProducts / maxProducts) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">
              {`You've reached the maximum number of products allowed in your current plan.`}
              Upgrade to add more products and grow your business.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Upgrade Benefits:</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Add unlimited or more products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Access to premium features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Better visibility and ranking</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Cancel
            </button>
            <Link
              href="/dashboard/subscription"
              className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold flex items-center justify-center gap-2"
            >
              Upgrade Plan
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
