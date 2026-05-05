'use client';

import Link from 'next/link';
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Package,
  Plug2,
  Settings2,
  Users,
  Wrench,
} from 'lucide-react';

const links = [
  { href: '/dashboard', label: 'Dashboard overview', icon: LayoutDashboard, desc: 'Store summary and stats' },
  { href: '/dashboard/products', label: 'Products', icon: Package, desc: 'Manage catalog' },
  { href: '/dashboard/services', label: 'Services', icon: Wrench, desc: 'Service offerings' },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, desc: 'Plan and billing' },
  { href: '/dashboard/payment-integration', label: 'Payment integration', icon: Plug2, desc: 'Razorpay and QR' },
  { href: '/dashboard/boost', label: 'Boost', icon: Megaphone, desc: 'Visibility boosts' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, desc: 'Alerts' },
  { href: '/dashboard/referral', label: 'Referral', icon: Users, desc: 'Invite friends' },
] as const;

export default function DashboardSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-slate-900">
          <Settings2 className="h-7 w-7 text-sky-600" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-slate-600">Quick links to manage your store and account.</p>
      </div>

      <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {links.map(({ href, label, icon: Icon, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-start gap-4 px-4 py-4 transition hover:bg-slate-50 sm:px-5"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">{label}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
