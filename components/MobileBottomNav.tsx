'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Home,
  Store,
  Building2,
  Grid3x3,
  PlusCircle,
  LayoutDashboard,
  Package,
  CreditCard,
  QrCode,
  Settings,
  LogOut,
  ChevronRight,
  CircleHelp,
  Plug2,
} from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { getStoreBySlugFromApi } from '@/src/lib/api';
import { STORE_PROFILE_REFRESH_EVENT, storeCanAccessPaymentIntegrationHub } from '@/src/lib/storeSubscriptionAddons';
import allStoresNavSvg from '@/assets/all-stores.svg';

type NavItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  href?: string;
  isActive?: boolean;
  action?: () => void;
  accent?: string;
};

type DrawerItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
};

const DEFAULT_ACCENT = '#0f172a';

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const MOBILE_NAV_BAR_CLASS =
  'relative flex h-[68px] w-full items-center justify-around overflow-visible rounded-t-[1.6rem] border border-slate-200/95 bg-white/90 px-1 py-1 shadow-[0_-10px_40px_-14px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/[0.04] backdrop-blur-xl supports-[backdrop-filter]:bg-white/82';

/** Continuous icon motion — subtle when inactive, stronger loops when tab is active. Respects prefers-reduced-motion. */
function useNavIconMotion(navKey: string, isActive: boolean) {
  const reduceMotion = useReducedMotion();
  return useMemo(() => {
    if (reduceMotion) {
      return { animate: { y: 0, scale: 1, rotate: 0 }, transition: { duration: 0.01 } };
    }
    if (isActive) {
      switch (navKey) {
        case 'home':
          return {
            animate: { y: [0, -2.5, 0], scale: [1, 1.08, 1] },
            transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
          };
        case 'all-stores':
          return {
            animate: { scale: [1, 1.1, 1.02, 1] },
            transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const },
          };
        case 'products':
          return {
            animate: { rotate: [0, -4, 4, -2.5, 0] },
            transition: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' as const },
          };
        case 'mystore':
          return {
            animate: { scale: [1, 1.08, 1], y: [0, -1.5, 0] },
            transition: { duration: 2.35, repeat: Infinity, ease: 'easeInOut' as const },
          };
        case 'dashboard':
          return {
            animate: { y: [0, -2.2, 0], scale: [1, 1.05, 1] },
            transition: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const },
          };
        case 'add-primary':
          return {
            animate: { rotate: [0, -10, 10, -6, 0], scale: [1, 1.07, 1] },
            transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const },
          };
        default:
          return {
            animate: { scale: [1, 1.06, 1] },
            transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const },
          };
      }
    }
    return {
      animate: { y: [0, -1.2, 0] },
      transition: {
        duration: 3.2 + (navKey.length % 4) * 0.35,
        repeat: Infinity,
        ease: 'easeInOut' as const,
        repeatDelay: 0.6,
      },
    };
  }, [reduceMotion, isActive, navKey]);
}

/** Logged-out mobile tab: storefront CTA with CSS glow flush + Motion icon sparkle. */
const SellStartNavTile = ({ href, isActive }: { href: string; isActive?: boolean }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className="flex h-full flex-1" whileTap={reduceMotion ? undefined : { scale: 0.94 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}>
      <Link
        href={href}
        prefetch
        className="group relative z-[2] flex h-full min-h-0 w-full flex-col items-center justify-center px-0.5"
        aria-current={isActive ? 'page' : undefined}
        aria-label="Create store — free setup"
      >
        <span className="pointer-events-none absolute right-0 top-1/2 z-0 flex -translate-y-1/2 translate-x-[1px] flex-col gap-[5px]" aria-hidden>
          <span className="sell-spark-ray h-[2px] w-[7px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-green-500 opacity-70" style={{ animationDelay: '0ms' }} />
          <span className="sell-spark-ray h-[2px] w-[11px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-green-500 opacity-80" style={{ animationDelay: '180ms' }} />
          <span className="sell-spark-ray h-[2px] w-[8px] rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-green-500 opacity-70" style={{ animationDelay: '360ms' }} />
        </span>
        <div
          className={`sell-start-card-animate relative z-[1] flex w-[min(4.4rem,28vw)] flex-col items-center rounded-[14px] border bg-gradient-to-b from-white to-emerald-50/40 px-1 pb-[5px] pt-[1.15rem] shadow-[0_2px_12px_rgba(5,150,105,0.08)] ${
            isActive ? 'border-emerald-400 ring-[2px] ring-emerald-300/70' : 'border-emerald-200/85'
          }`}
        >
          <span className="absolute right-[3px] top-[5px] z-10 whitespace-nowrap rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 px-[5px] py-[2px] text-[6.5px] font-extrabold uppercase leading-none tracking-[0.14em] text-white shadow-[0_1px_3px_rgba(5,150,105,0.45)]">
            Free
          </span>
          <motion.span
            className="inline-flex items-center justify-center"
            animate={reduceMotion ? { rotate: 0, scale: 1 } : { rotate: [0, 8, -6, 0], scale: [1, 1.06, 1.04, 1] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Store className="h-5 w-5 text-[#047857]" strokeWidth={2.35} aria-hidden />
          </motion.span>
          <p className="mt-0.5 text-center text-[9.5px] font-bold leading-tight tracking-[0.01em] text-[#065f46]">
            Create Store
          </p>
        </div>
      </Link>
    </motion.div>
  );
};

const NavButton = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const accent = item.accent ?? DEFAULT_ACCENT;
  const active = Boolean(item.isActive);
  const iconMot = useNavIconMotion(item.key, active);

  const iconColor = active ? accent : withAlpha(accent, 0.88);
  const labelColor = active ? accent : withAlpha(accent, 0.72);
  const pedestalBg = active ? withAlpha(accent, 0.14) : 'rgba(241,245,249,0.98)';
  const pedestalRing = active ? `0 0 0 1.5px ${withAlpha(accent, 0.28)}` : '0 0 0 1px rgba(226,232,240,0.9)';

  const innerContent = (
    <>
      <motion.span
        className="relative mb-[3px] inline-flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          background: pedestalBg,
          boxShadow: pedestalRing,
        }}
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      >
        <motion.span className="inline-flex items-center justify-center" {...iconMot}>
          {item.key === 'all-stores' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof allStoresNavSvg === 'string' ? allStoresNavSvg : allStoresNavSvg.src}
              alt=""
              width={17}
              height={17}
              className={`h-[17px] w-[17px] shrink-0 object-contain transition-opacity ${active ? 'opacity-100' : 'opacity-[0.92]'}`}
              aria-hidden
            />
          ) : (
            <Icon className="h-[17px] w-[17px]" style={{ color: iconColor }} strokeWidth={active ? 2.4 : 2.05} aria-hidden />
          )}
        </motion.span>
      </motion.span>
      <span
        className={`relative max-w-[4.75rem] text-center text-[10px] leading-[1.15] tracking-wide ${active ? 'font-semibold' : 'font-medium'} whitespace-normal break-words [overflow-wrap:anywhere]`}
        style={{ color: labelColor }}
      >
        {item.label}
      </span>
    </>
  );

  const tapTransition = { type: 'spring' as const, stiffness: 460, damping: 32 };

  const linkClass =
    'group relative flex min-h-0 flex-1 flex-col items-center justify-center rounded-[13px] px-1 pt-1 text-current transition-colors duration-200 hover:bg-slate-50/80';

  if (item.action) {
    return (
      <motion.button
        type="button"
        onClick={item.action}
        whileTap={{ scale: 0.935 }}
        transition={tapTransition}
        className={linkClass}
      >
        {innerContent}
      </motion.button>
    );
  }

  return (
    <motion.div className="flex min-h-0 flex-1" whileTap={{ scale: 0.935 }} transition={tapTransition}>
      <Link href={item.href ?? '#'} prefetch className={linkClass}>
        {innerContent}
      </Link>
    </motion.div>
  );
};

const LoggedOutBottomNav = ({ items, pathname }: { items: NavItem[]; pathname: string }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 overflow-visible px-0 pb-[env(safe-area-inset-bottom)] pt-0">
    <div className={MOBILE_NAV_BAR_CLASS}>
      {items.map((item) =>
        item.key === 'create' && item.href ? (
          <SellStartNavTile key={item.key} href={item.href} isActive={pathname.startsWith('/create-store')} />
        ) : (
          <NavButton key={item.key} item={item} />
        ),
      )}
    </div>
  </nav>
);

const LoggedInBottomNav = ({ items }: { items: NavItem[] }) => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 overflow-visible px-0 pb-[env(safe-area-inset-bottom)] pt-0">
    <div className={MOBILE_NAV_BAR_CLASS}>
      {items.map((item) => (
        <NavButton key={item.key} item={item} />
      ))}
    </div>
  </nav>
);

const Drawer = ({
  isOpen,
  onClose,
  storeSlug,
  items,
  userName,
  isLoggedIn,
}: {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string | null;
  items: DrawerItem[];
  userName: string;
  isLoggedIn: boolean;
}) => (
  <div className={`md:hidden fixed inset-0 z-30 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
    <div className={`absolute inset-0 bg-slate-950/35 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
    <div
      className={`absolute inset-x-0 bottom-[76px] max-h-[calc(80vh-76px)] border-t border-slate-200 bg-white text-slate-900 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300" />
      <div className="overflow-y-auto px-0 py-3" style={{ maxHeight: 'calc(80vh - 2rem)' }}>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f59e0b,#f97316)] text-sm font-bold text-white">
              {userName.trim().charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-semibold text-slate-900">{userName}</p>
              <p className="text-sm text-slate-500">{isLoggedIn ? 'Online' : 'Guest'}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200" />
        <div className="px-3 py-2">
          {storeSlug && isLoggedIn && (
            <Link
              href={`/store/${storeSlug}`}
              prefetch
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[17px] font-medium text-slate-800 transition hover:bg-slate-50"
              onClick={onClose}
            >
              <Store className="h-5 w-5 text-slate-500" />
              <span className="flex-1">View My Store</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          )}
          {items.map((item, index) => {
            const Icon = item.icon;
            const isLogout = item.label.toLowerCase() === 'logout';
            const isSettings = item.label.toLowerCase() === 'settings';
            const showTopDivider = index === items.length - 1;
            const rowClassName = `flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[17px] font-medium transition ${
              isLogout ? 'text-red-600 hover:bg-red-50' : 'text-slate-800 hover:bg-slate-50'
            }`;
            const iconClassName = isLogout ? 'h-5 w-5 text-red-500' : 'h-5 w-5 text-slate-500';

            const content = item.action ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  item.action?.();
                }}
                className={rowClassName}
              >
                <Icon className={iconClassName} />
                <span className="flex-1">{item.label}</span>
                {!isLogout && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            ) : (
              <Link
                href={item.href as string}
                prefetch
                className={rowClassName}
                onClick={onClose}
              >
                <Icon className={iconClassName} />
                <span className="flex-1">{item.label}</span>
                {isSettings ? <CircleHelp className="h-4 w-4 text-slate-400 opacity-0" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </Link>
            );

            return (
              <div key={item.label}>
                {showTopDivider && <div className="my-2 border-t border-slate-200" />}
                {content}
                {!isLogout && index !== items.length - 1 && <div className="mx-3 border-b border-slate-200" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);

const QrModal = ({ isOpen, onClose, storeShareUrl }: { isOpen: boolean; onClose: () => void; storeShareUrl: string | null }) => (
  <div className={`md:hidden fixed inset-0 z-30 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
    <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
    <div
      className={`absolute inset-x-4 bottom-[76px] rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 ease-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Share store</p>
          <h3 className="text-lg font-semibold text-slate-900">QR Code</h3>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-slate-500">
          Close
        </button>
      </div>
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-inner">
          {storeShareUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(storeShareUrl)}`}
              alt="Store QR code"
              className="h-44 w-44"
            />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center text-center text-sm text-slate-500">
              Add your store to generate QR
            </div>
          )}
        </div>
        {storeShareUrl && (
          <button
            type="button"
            onClick={() => navigator.share?.({ title: 'My Store', url: storeShareUrl })}
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Share Link
          </button>
        )}
      </div>
    </div>
  </div>
);

const Toast = ({ message }: { message: string }) => (
  <div className="md:hidden fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
    {message}
  </div>
);

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn: authLoggedIn, user, logout } = useAuth();
  const [legacyAuth, setLegacyAuth] = useState<{ storeSlug: string | null; isAuthenticated: boolean }>({
    storeSlug: null,
    isAuthenticated: false,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [appOrigin, setAppOrigin] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [storeBusinessType, setStoreBusinessType] = useState<'product' | 'service' | 'hybrid' | null>(null);
  const [paymentsHubEligible, setPaymentsHubEligible] = useState(false);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeQrModal = useCallback(() => setQrModalOpen(false), []);

  const showToast = useCallback((message: string) => {
    if (toastRef.current) {
      clearTimeout(toastRef.current);
    }
    setToast(message);
    toastRef.current = setTimeout(() => setToast(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastRef.current) {
        clearTimeout(toastRef.current);
      }
    };
  }, []);

  const syncAuthState = useCallback(() => {
    try {
      const pending = localStorage.getItem('pendingRegistration');
      if (pending) {
        const parsed = JSON.parse(pending);
        const slug = parsed?.userData?.storeSlug || parsed?.userData?.username || null;
        setLegacyAuth({ storeSlug: slug, isAuthenticated: Boolean(parsed?.isAuthenticated) });
      } else {
        setLegacyAuth({ storeSlug: null, isAuthenticated: false });
      }
    } catch (error) {
      setLegacyAuth({ storeSlug: null, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    syncAuthState();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', syncAuthState);
    window.addEventListener('pendingRegistrationChanged', syncAuthState);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('pendingRegistrationChanged', syncAuthState);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncAuthState]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || qrModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, qrModalOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  /** Route changes via Next.js should never leave bottom-sheet overlays in a captured state. */
  useEffect(() => {
    closeDrawer();
    closeQrModal();
  }, [pathname, closeDrawer, closeQrModal]);

  useEffect(() => {
    const targets = [
      '/',
      '/products',
      '/all-stores',
      '/auth',
      '/create-store',
      '/dashboard',
      '/dashboard/products',
      '/dashboard/subscription',
    ];
    targets.forEach((href) => {
      try {
        router.prefetch(href);
      } catch {
        /* ignore */
      }
    });
  }, [router]);

  const derivedStoreSlug = user?.storeSlug ?? legacyAuth.storeSlug;
  const isLoggedIn = authLoggedIn || legacyAuth.isAuthenticated;
  const storeShareUrl = derivedStoreSlug ? `${appOrigin}/store/${derivedStoreSlug}` : null;
  const ownerStoreView = useMemo(() => {
    if (!derivedStoreSlug || !pathname) return false;
    return pathname.startsWith(`/store/${derivedStoreSlug}`);
  }, [pathname, derivedStoreSlug]);
  const onDashboardPage = pathname?.startsWith('/dashboard');

  useEffect(() => {
    let isMounted = true;
    if (!derivedStoreSlug) {
      setStoreBusinessType(null);
      return undefined;
    }

    (async () => {
      try {
        const store = await getStoreBySlugFromApi(derivedStoreSlug);
        if (!isMounted) return;
        const type = store?.businessType;
        if (type === 'product' || type === 'service' || type === 'hybrid') {
          setStoreBusinessType(type);
        } else {
          setStoreBusinessType(null);
        }
        setPaymentsHubEligible(storeCanAccessPaymentIntegrationHub(store));
      } catch (error) {
        if (!isMounted) return;
        setStoreBusinessType(null);
        setPaymentsHubEligible(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [derivedStoreSlug, pathname]);

  useEffect(() => {
    if (!derivedStoreSlug) return undefined;
    let isMounted = true;
    const onRefresh = () => {
      void (async () => {
        try {
          const store = await getStoreBySlugFromApi(derivedStoreSlug);
          if (!isMounted) return;
          const type = store?.businessType;
          if (type === 'product' || type === 'service' || type === 'hybrid') {
            setStoreBusinessType(type);
          } else {
            setStoreBusinessType(null);
          }
          setPaymentsHubEligible(storeCanAccessPaymentIntegrationHub(store));
        } catch {
          if (!isMounted) return;
          setStoreBusinessType(null);
          setPaymentsHubEligible(false);
        }
      })();
    };
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    return () => {
      isMounted = false;
      window.removeEventListener(STORE_PROFILE_REFRESH_EVENT, onRefresh);
    };
  }, [derivedStoreSlug]);

  const isServiceOnlyStore = storeBusinessType === 'service';
  const addCtaLabel = isServiceOnlyStore ? 'Add Service' : 'Add Product';
  const addCtaHref = isServiceOnlyStore ? '/dashboard/services' : '/dashboard/products';
  const onPrimaryAddPage = pathname?.startsWith(addCtaHref) ?? false;

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fallback below
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch (error) {
      return false;
    } finally {
      textarea.remove();
    }
  }, []);

  const handleShareStore = useCallback(async () => {
    if (!storeShareUrl) {
      showToast('Set up your store to share');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check my store', url: storeShareUrl });
        showToast('Store link shared');
        return;
      } catch (error) {
        // fallback to copy
      }
    }

    const copied = await copyToClipboard(storeShareUrl);
    showToast(copied ? 'Store link copied' : 'Unable to copy link');
  }, [copyToClipboard, showToast, storeShareUrl]);

  const handleLogout = useCallback(() => {
    try {
      const pending = localStorage.getItem('pendingRegistration');
      if (pending) {
        const parsed = JSON.parse(pending);
        const updated = { ...parsed, isAuthenticated: false };
        localStorage.setItem('pendingRegistration', JSON.stringify(updated));
      } else {
        localStorage.removeItem('pendingRegistration');
      }
    } catch (error) {
      localStorage.removeItem('pendingRegistration');
    }
    setLegacyAuth({ storeSlug: null, isAuthenticated: false });
    logout({ redirectTo: '/auth' });
    window.dispatchEvent(new Event('pendingRegistrationChanged'));
    closeDrawer();
  }, [closeDrawer, logout, showToast]);

  const loggedOutNavItems = useMemo<NavItem[]>(() => {
    const allStoresItem = {
      key: 'all-stores',
      href: '/all-stores',
      icon: Building2,
      label: 'All Stores',
      isActive: pathname?.startsWith('/all-stores'),
    };

    if (ownerStoreView) {
      return [
        { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
        allStoresItem,
        {
          key: 'add-primary',
          href: isLoggedIn ? addCtaHref : '/auth',
          icon: PlusCircle,
          label: addCtaLabel,
          accent: '#f97316',
        },
      ];
    }

    const items: NavItem[] = [
      { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
      allStoresItem,
    ];

    if (!onDashboardPage) {
      items.push({ key: 'products', href: '/products', icon: Grid3x3, label: 'Products', isActive: pathname?.startsWith('/products'), accent: '#6366f1' });
    }

    items.push({
      key: 'create',
      href: isLoggedIn ? '/create-store' : '/auth',
      icon: Store,
      label: 'Create Store',
      accent: '#db2777',
    });

    return items;
  }, [isLoggedIn, onDashboardPage, ownerStoreView, pathname]);

  /** Logged-in mobile footer. "My Store" is hidden while viewing your own storefront; it returns on any other route. */
  const loggedInNavItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { key: 'home', href: '/', icon: Home, label: 'Home', isActive: pathname === '/', accent: '#22c55e' },
      {
        key: 'all-stores',
        href: '/all-stores',
        icon: Building2,
        label: 'All Stores',
        isActive: Boolean(pathname?.startsWith('/all-stores')),
        accent: '#0ea5e9',
      },
      {
        key: 'products',
        href: '/products',
        icon: Grid3x3,
        label: 'Products',
        isActive: Boolean(pathname?.startsWith('/products')),
        accent: '#6366f1',
      },
    ];

    if (!ownerStoreView && derivedStoreSlug) {
      items.push({
        key: 'mystore',
        href: `/store/${derivedStoreSlug}`,
        icon: Store,
        label: 'My Store',
        isActive: Boolean(pathname?.startsWith('/store/')),
        accent: '#14b8a6',
      });
    }

    /** No slug yet: keep dashboard shortcut where "My Store" would go. */
    if (!derivedStoreSlug) {
      items.push({
        key: 'mystore',
        href: '/dashboard',
        icon: Store,
        label: 'My Store',
        isActive: Boolean(pathname?.startsWith('/dashboard')),
        accent: '#14b8a6',
      });
    }

    // Mobile requirement:
    // - If user has no store slug yet: show Dashboard shortcut.
    // - If user is currently viewing their own store (My Store tab is hidden): show Dashboard.
    if (!derivedStoreSlug || ownerStoreView) {
      items.push({
        key: 'dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        isActive: Boolean(pathname?.startsWith('/dashboard')),
        accent: '#2563eb',
      });
    }

    return items;
  }, [derivedStoreSlug, pathname, ownerStoreView]);

  const drawerItems = useMemo<DrawerItem[]>(() => {
    const items: DrawerItem[] = [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/products', icon: Package, label: 'My Products' },
      { href: '/dashboard/subscription', icon: CreditCard, label: 'Subscription' },
    ];
    if (paymentsHubEligible) {
      items.push({ href: '/dashboard/payment-integration', icon: Plug2, label: 'Payment settings' });
    }
    items.push(
      { icon: QrCode, label: 'QR Code', action: () => setQrModalOpen(true) },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
      { icon: LogOut, label: 'Logout', action: handleLogout }
    );
    return items;
  }, [handleLogout, paymentsHubEligible]);

  const publicDrawerItems = useMemo<DrawerItem[]>(
    () => [
      { href: '/', icon: Home, label: 'Home' },
      { href: '/#stores', icon: Building2, label: 'Stores' },
      { href: '/#products', icon: Grid3x3, label: 'Products' },
      { href: isLoggedIn ? '/create-store' : '/auth', icon: Store, label: 'Create Store' },
    ],
    [isLoggedIn]
  );

  const activeDrawerItems = isLoggedIn ? drawerItems : publicDrawerItems;

  return (
    <>
      {isLoggedIn ? (
        <LoggedInBottomNav items={loggedInNavItems} />
      ) : (
        <LoggedOutBottomNav items={loggedOutNavItems} pathname={pathname ?? ''} />
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        storeSlug={derivedStoreSlug}
        items={activeDrawerItems}
        userName={user?.name ?? 'User'}
        isLoggedIn={isLoggedIn}
      />
      <QrModal isOpen={qrModalOpen} onClose={closeQrModal} storeShareUrl={storeShareUrl} />

      {toast && <Toast message={toast} />}
    </>
  );
}
