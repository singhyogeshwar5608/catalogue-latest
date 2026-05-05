'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, Zap, Star, ShoppingBag, LogOut, Palette, Loader2, Store, Grid, Layout } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

const adminMenuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/themes', icon: Palette, label: 'Themes' },
  { href: '/admin/stores', icon: Store, label: 'Stores' },
  { href: '/admin/categories', icon: Grid, label: 'Categories' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/plans', icon: CreditCard, label: 'Plans' },
  { href: '/admin/boosts', icon: Zap, label: 'Boosts' },
  { href: '/admin/reviews', icon: Star, label: 'Reviews' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isLoggedIn, user } = useAuth();
  const isAuthorized = isLoggedIn && user?.role === 'super_admin';

  useEffect(() => {
    if (!isAuthorized) {
      router.replace('/auth?redirect=/admin');
    }
  }, [isAuthorized, router]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-600 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Redirecting to admin login...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex md:flex-col w-64 bg-gray-900 text-white min-h-screen">
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-300 hover:bg-gray-800 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
