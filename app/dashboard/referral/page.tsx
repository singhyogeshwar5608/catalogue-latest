'use client';

import { Copy, Users, Calendar, Gift } from 'lucide-react';
import { useState } from 'react';

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralCode = 'TECH2026';
  const referralLink = `https://cateloge.com/register?ref=${referralCode}`;
  const statCards = [
    { label: 'Total Referrals', value: '12', delta: '+4%', positive: true },
    { label: 'Days Earned', value: '36', delta: '+2%', positive: true },
    { label: 'Pending Rewards', value: '9 days', delta: '+1%', positive: true },
    { label: 'Conversion Rate', value: '62%', delta: '-3%', positive: false },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Referral Program</h1>
        <p className="text-sm md:text-base text-gray-600">Invite friends and earn free subscription days</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs md:text-sm font-medium text-gray-500">{card.label}</p>
              <span className={`text-[10px] md:text-xs font-semibold flex items-center gap-1 ${
                card.positive ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {card.positive ? '▲' : '▼'} {card.delta}
              </span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-xl p-4 md:p-6 mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Your Referral Link</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm md:text-base"
          />
          <button
            onClick={handleCopy}
            className="px-4 md:px-6 py-2 md:py-3 bg-primary text-white rounded-lg hover:bg-primary-700 transition font-semibold flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <Copy className="w-4 h-4 md:w-5 md:h-5" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs md:text-sm text-gray-600 mt-3">
          Share this link with your friends. When they sign up and subscribe, you both get 3 free days!
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl md:text-2xl font-bold text-primary">1</span>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">Share Your Link</h3>
            <p className="text-gray-600 text-xs md:text-sm">Send your unique referral link to friends and family</p>
          </div>
          <div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl md:text-2xl font-bold text-primary">2</span>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">They Sign Up</h3>
            <p className="text-gray-600 text-xs md:text-sm">Your friend creates a store and subscribes to any plan</p>
          </div>
          <div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-xl md:text-2xl font-bold text-primary">3</span>
            </div>
            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1 md:mb-2">Both Get Rewards</h3>
            <p className="text-gray-600 text-xs md:text-sm">You both receive 3 free subscription days</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Recent Referrals</h2>
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img src="https://i.pravatar.cc/150?img=12" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm md:text-base font-medium text-gray-900 truncate">Rahul Sharma</p>
                <p className="text-xs md:text-sm text-gray-500">Joined 2 days ago</p>
              </div>
            </div>
            <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 text-xs md:text-sm font-semibold rounded-full flex-shrink-0">
              +3 days
            </span>
          </div>
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img src="https://i.pravatar.cc/150?img=5" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm md:text-base font-medium text-gray-900 truncate">Priya Patel</p>
                <p className="text-xs md:text-sm text-gray-500">Joined 5 days ago</p>
              </div>
            </div>
            <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 text-xs md:text-sm font-semibold rounded-full flex-shrink-0">
              +3 days
            </span>
          </div>
          <div className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <img src="https://i.pravatar.cc/150?img=33" alt="User" className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm md:text-base font-medium text-gray-900 truncate">Amit Kumar</p>
                <p className="text-xs md:text-sm text-gray-500">Joined 1 week ago</p>
              </div>
            </div>
            <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 text-xs md:text-sm font-semibold rounded-full flex-shrink-0">
              +3 days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
