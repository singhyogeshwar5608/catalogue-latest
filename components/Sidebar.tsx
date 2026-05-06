'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardNotificationsBell from '@/components/dashboard/DashboardNotificationsBell';
import {
  LayoutDashboard,
  Package,
  Zap,
  CreditCard,
  Users,
  Bell,
  Menu,
  X,
  ShoppingBag,
  Briefcase,
  LogOut,
  Home,
  Plug2,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import {
  getMyFollowNotifications,
  getMyStoreNotifications,
  getMyStores,
  getStoreBySlug,
  getStoreBySlugFromApi,
  isApiError,
} from '@/src/lib/api';
import { STORE_PROFILE_REFRESH_EVENT, storeCanAccessPaymentIntegrationHub } from '@/src/lib/storeSubscriptionAddons';
import type { Store } from '@/types';
import faviconIcon from '@/assets/icon-512x512.svg';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadStore = useCallback(async () => {
    const slug = user?.storeSlug?.trim();
    if (!slug) {
      setMyStore(null);
      return;
    }

    const loadByKey = async (key: string) => getStoreBySlugFromApi(key);

    try {
      const store = await loadByKey(slug);
      setMyStore(store);
      return;
    } catch (error) {
      const apiStatus = isApiError(error) ? error.status : undefined;

      if (apiStatus === 404) {
        try {
          const cached = await getStoreBySlug(slug);
          setMyStore(cached);
          return;
        } catch {
          /* continue */
        }
        try {
          const owned = await getMyStores();
          const canonical = owned[0]?.username?.trim();
          if (canonical && canonical.toLowerCase() !== slug.toLowerCase()) {
            const store = await loadByKey(canonical);
            setMyStore(store);
            return;
          }
        } catch {
          /* continue */
        }
      }

      if (typeof apiStatus === 'number' && apiStatus >= 500) {
        try {
          const fallbackStore = await getStoreBySlug(slug);
          setMyStore(fallbackStore);
          return;
        } catch (fallbackError) {
          console.error('Failed to load store via both endpoints:', fallbackError);
        }
      } else if (apiStatus !== 404) {
        console.error('Failed to load store:', error);
      }

      setMyStore(null);
    }
  }, [user?.storeSlug]);

  useEffect(() => {
    loadStore();
  }, [loadStore, pathname]);

  /** Client navigations leave no full reload; reset menu/backdrop so a stale overlay cannot block taps (e.g. hamburger). */
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onRefresh = () => {
      void loadStore();
    };
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
  }, [loadStore]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    let isMounted = true;

    const loadUnreadNotifications = async () => {
      try {
        const [owner, follower] = await Promise.all([
          getMyStoreNotifications({ limit: 1 }),
          getMyFollowNotifications({ limit: 1 }),
        ]);
        if (!isMounted) return;
        setUnreadNotifications(owner.unread_count + follower.unread_count);
      } catch {
        if (!isMounted) return;
        setUnreadNotifications(0);
      }
    };

    void loadUnreadNotifications();
    const id = window.setInterval(() => {
      void loadUnreadNotifications();
    }, 7000);

    return () => {
      isMounted = false;
      window.clearInterval(id);
    };
  }, [user]);

  const businessType = myStore?.businessType || 'product';
  const showPaymentsHub = storeCanAccessPaymentIntegrationHub(myStore);

  const menuItems = [
    { href: '/', icon: Home, label: 'Home Page' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
    ...(businessType === 'product' || businessType === 'hybrid'
      ? ([
          { href: '/dashboard/products', icon: Package, label: 'Products' },
          { href: '/dashboard/orders', icon: Receipt, label: 'Orders' },
        ] as const)
      : []),
    ...(businessType === 'service' || businessType === 'hybrid' 
      ? [{ href: '/dashboard/services', icon: Briefcase, label: 'Services' }] 
      : []),
    // { href: '/dashboard/boost', icon: Zap, label: 'Boost Store' },
    { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
    ...(showPaymentsHub
      ? [{ href: '/dashboard/payment-integration', icon: Plug2, label: 'Payment settings' } as const]
      : []),
    { href: '/dashboard/referral', icon: Users, label: 'Referrals' },
  ];

  useEffect(() => {
    const paths = [
      '/',
      '/dashboard',
      '/dashboard/notifications',
      '/dashboard/products',
      '/dashboard/orders',
      '/dashboard/services',
      '/dashboard/subscription',
      '/dashboard/payment-integration',
      '/dashboard/referral',
    ];
    paths.forEach((href) => {
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
    });
  }, [router]);

  const isNavActive = useCallback(
    (href: string) => {
      if (!pathname) return false;
      if (href === '/') return pathname === '/';
      if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/';
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    // Hard redirect first path: no intermediate React re-render on `/dashboard/*` (avoids 401 / "Unauthorized" flash).
    logout({ redirectTo: '/auth' });
  };

  const registeredEmail = user?.email?.trim() ?? '';

  return (
    <>
      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-[60] flex min-h-[3.75rem] items-center justify-between border-b border-gray-200 bg-white px-4 pb-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 pr-2">
          {myStore?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={myStore.logo}
              alt={myStore.name || 'Store logo'}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <ShoppingBag className="h-6 w-6 shrink-0 text-primary" />
          )}
          <span className="truncate text-lg font-bold text-gray-900">
            {myStore?.name?.trim() ? myStore.name : 'Larawans'}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {user && pathname.startsWith('/dashboard') ? <DashboardNotificationsBell /> : null}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[52] bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`md:hidden fixed inset-0 z-[54] bg-white transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 pt-[max(5.25rem,env(safe-area-inset-top,0px)+4.25rem)]">
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        scroll
                        onClick={(e) => {
                          setIsMobileMenuOpen(false);
                          if (item.href === '/' && typeof window !== 'undefined') {
                            e.preventDefault();
                            // Hard navigate to fully replace the dashboard shell (fix: URL updates but UI stays on dashboard).
                            window.location.assign('/');
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="relative">
                          <Icon className="w-5 h-5" />
                          {item.href === '/dashboard/notifications' && unreadNotifications > 0 ? (
                            <span className="absolute -right-2 -top-2 inline-flex min-w-[17px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                              {unreadNotifications > 99 ? '99+' : unreadNotifications}
                            </span>
                          ) : null}
                        </div>
                        <span className="truncate text-[13px] font-medium leading-tight">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {registeredEmail ? (
              <div className="mx-8 mb-2 rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                  Registered email
                </p>
                <p className="truncate text-[13px] font-medium text-gray-900">{registeredEmail}</p>
              </div>
            ) : null}

            <div className="absolute left-0 right-0 bottom-16 p-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 w-full text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="truncate text-[13px] font-medium leading-tight">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="z-30 hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:border-r md:border-gray-200 md:bg-white">
        <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-6">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            {/* Website logo (static) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faviconIcon.src}
              alt="Larawans"
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="truncate text-xl font-bold text-gray-900">Larawans</span>
          </Link>
          {user && pathname.startsWith('/dashboard') ? (
            <div className="shrink-0">
              <DashboardNotificationsBell />
            </div>
          ) : null}
        </div>
        {registeredEmail ? (
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Registered email
            </p>
            <p className="truncate text-sm font-medium text-gray-900">{registeredEmail}</p>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = isNavActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      scroll
                      onClick={(e) => {
                        setIsMobileMenuOpen(false);
                        if (item.href === '/' && typeof window !== 'undefined') {
                          e.preventDefault();
                          window.location.assign('/');
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" />
                        {item.href === '/dashboard/notifications' && unreadNotifications > 0 ? (
                          <span className="absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                            {unreadNotifications > 99 ? '99+' : unreadNotifications}
                          </span>
                        ) : null}
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
