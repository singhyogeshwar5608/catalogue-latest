'use client';

import { useEffect } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FooterSellCtaBanner from "@/components/FooterSellCtaBanner";
import MobileBottomNav from "@/components/MobileBottomNav";
import GoogleTranslateScripts from "@/components/GoogleTranslateScripts";
import GoogleTranslateNavigationGuard from "@/components/GoogleTranslateNavigationGuard";
import GoogtransSync from "@/components/GoogtransSync";
import NavigationProgress from "@/components/NavigationProgress";
import PwaSpaOmniboxRefresh from "@/components/PwaSpaOmniboxRefresh";
import PwaStoreInstallButton from "@/components/PwaStoreInstallButton";
import FloatingHelpButton from "@/components/FloatingHelpButton";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/context/AuthContext";
import { StoreProvider } from "@/src/context/StoreContext";
import { LocationProvider } from "@/src/context/LocationContext";
import { SearchProvider } from "@/src/context/SearchContext";
import { getStoreBySlugFromApi, getStoredUser } from "@/src/lib/api";
import faviconIcon from "@/assets/icon-512x512.svg";

export default function RootLayoutClient({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  const isAdminRoute = pathname?.startsWith('/admin');
  const isDashboard = isDashboardRoute || isAdminRoute;
  const isStorePage = pathname?.startsWith('/store');
  const isCatalogPage = pathname?.startsWith('/catalog');
  const isProductPage = pathname?.startsWith('/product');
  const isLoginPage = pathname === '/login';
  const isCreateStorePage = pathname === '/create-store';
  const isAuthPage = pathname === '/auth';
  const isAllStoresPage = pathname === '/all-stores';
  /** These pages are short; min-h-screen on main leaves a tall empty band above the footer. */
  const isCompactInfoPage =
    pathname === '/help-center' ||
    pathname === '/contact' ||
    pathname === '/about' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/cookies' ||
    pathname === '/careers';
  const hideNavbar = isDashboard;
  const hideFooter = isDashboard || isStorePage || isProductPage || isLoginPage || isCatalogPage;
  const hideBottomNav = isAdminRoute;

  const showFixedNavbar = !hideNavbar && !isStorePage;
  // Navbar is `h-16` (64px). Use a slightly larger padding to avoid overlap, but keep
  // the hero/banner close (desktop gap too big with pt-20/pt-24).
  const mainTopPadding = showFixedNavbar ? 'pt-16 md:pt-[70px]' : '';
  const isAuthLikePage = isAuthPage || isLoginPage || isCreateStorePage;

  const mainBottomPaddingClass = hideBottomNav
    ? ''
    : isAuthLikePage
      ? 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+2rem)] md:pb-0'
    : isAllStoresPage
      ? 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+0.375rem)] md:pb-0'
      : 'pb-[calc(68px+env(safe-area-inset-bottom,0px)+0.8rem)] md:pb-0';
  const mainPaddingClass = `${mainBottomPaddingClass} ${mainTopPadding}`.trim();

  useEffect(() => {
    window?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  /** Minimal service worker so Chrome/Edge can offer install on all routes, not only home. */
  useEffect(() => {
    // Service workers are unstable in `next dev` (HMR + frequent reloads can throw InvalidStateError).
    // Keep SW enabled for production only.
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const head = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
          if (!head.ok) return;
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          await reg.update().catch(() => {
            /* registration may be redundant / script missing — avoid console InvalidStateError */
          });
        } catch {
          /* ignore: missing sw.js or offline */
        }
      })();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /**
   * Favicon: default site icon first, then
   * - public store pages `/store/:slug/...` → that store’s logo
   * - dashboard/admin → logged-in user’s own store logo (if any)
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    let cancelled = false;
    const setFavicon = (href: string) => {
      const head = document.head;
      const ensure = (rel: string) => {
        const relEscaped = rel.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const selector = 'link[rel="' + relEscaped + '"]';
        let el = head.querySelector(selector) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement('link');
          el.rel = rel;
          head.appendChild(el);
        }
        el.href = href;
      };
      ensure('icon');
      ensure('shortcut icon');
      ensure('apple-touch-icon');
    };

    // Reset first so a previous store’s icon does not carry over the wrong place.
    setFavicon(faviconIcon.src);

    if (pathname?.startsWith('/store/')) {
      const firstSeg = pathname.slice('/store/'.length).split('/').filter(Boolean)[0];
      if (firstSeg) {
        (async () => {
          try {
            const store = await getStoreBySlugFromApi(decodeURIComponent(firstSeg));
            if (cancelled) return;
            const logo = store?.logo?.trim();
            if (!logo) return;
            const version = (store as { updatedAt?: string })?.updatedAt
              ?? (store as { createdAt?: string })?.createdAt
              ?? Date.now();
            const url = `${logo}${logo.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`;
            setFavicon(url);
          } catch {
            // keep default favicon
          }
        })();
        return () => {
          cancelled = true;
        };
      }
    }

    const isDashboardLike = Boolean(pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin'));
    if (!isDashboardLike) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const slug = getStoredUser()?.storeSlug?.trim();
        if (!slug) return;
        const store = await getStoreBySlugFromApi(slug);
        if (cancelled) return;
        const logo = store?.logo?.trim();
        if (!logo) return;
        const version = (store as { updatedAt?: string })?.updatedAt
          ?? (store as { createdAt?: string })?.createdAt
          ?? Date.now();
        const url = `${logo}${logo.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`;
        setFavicon(url);
      } catch {
        // ignore: fall back to global favicon
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <>
      <NavigationProgress />
      <div id="google_translate_element" style={{ display: 'none' }} aria-hidden="true" suppressHydrationWarning />
      {/*
        Skip loading the translate widget on merchant/admin shells so the DOM is never rewritten there.
        Public pages still load scripts; dashboard uses full-page navigations (see GoogleTranslateNavigationGuard).
      */}
      {!isDashboard ? <GoogtransSync /> : null}
      {!isDashboard ? <GoogleTranslateScripts /> : null}
      <GoogleTranslateNavigationGuard />
      <AuthProvider>
        <PwaSpaOmniboxRefresh />
        <PwaStoreInstallButton />
        <StoreProvider>
          <LocationProvider>
            <SearchProvider>
              {!hideNavbar && (
                <div className={isStorePage ? 'hidden md:block' : ''}>
                  <Navbar />
                </div>
              )}
              <main
                className={`${isCompactInfoPage ? 'min-h-0' : 'min-h-screen'} w-full min-w-0 ${mainPaddingClass}`}
              >
                {/*
                  Google Translate wraps text nodes in extra elements; React client navigation then
                  crashes with removeChild(null) and the URL updates while the UI stays stale.
                  Merchant dashboard + admin must not be rewritten by the widget.
                */}
                {isDashboard ? (
                  <div className="notranslate" translate="no">
                    {children}
                  </div>
                ) : (
                  children
                )}
              </main>
              {!hideFooter && (
                <div className={isCreateStorePage || isAuthPage ? 'hidden md:block' : ''}>
                  {!isCreateStorePage ? <FooterSellCtaBanner /> : null}
                  <Footer />
                </div>
              )}
              {!hideBottomNav && <MobileBottomNav />}
              {!isDashboard && <FloatingHelpButton />}
            </SearchProvider>
          </LocationProvider>
        </StoreProvider>
      </AuthProvider>
    </>
  );
}
