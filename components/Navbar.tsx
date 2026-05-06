  'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, MapPin, ChevronDown, LogOut, LayoutTemplate, PlusCircle, Bell, CreditCard, LayoutDashboard } from 'lucide-react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useStoreSelection } from '@/src/context/StoreContext';
import { useLocationContext } from '@/src/context/LocationContext';
import {
  getCityLabel,
  getDistrictPreferredChipLabel,
  getDistrictStateLabel,
  searchLocations,
} from '@/src/lib/location';
import type { LocationSuggestion } from '@/src/lib/location';
import LanguageToggle from '@/components/LanguageToggle';
import desktopLogo from '@/assets/Larawans.svg';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();
  const { selectedStore } = useStoreSelection();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [isMobileLocationOpen, setIsMobileLocationOpen] = useState(false);
  const storeCtaRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const mobileLocationSectionRef = useRef<HTMLDivElement>(null);
  const suggestionControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    const targets = [
      '/',
      '/products',
      '/all-stores',
      '/auth',
      '/create-store',
      '/dashboard',
      '/dashboard/products',
      '/dashboard/notifications',
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

  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    setManualLocation,
    setSuggestedLocation,
  } = useLocationContext();

  const locationChipLabel = location
    ? getDistrictPreferredChipLabel(location)
    : locationLoading
      ? 'Detecting...'
      : 'Select location';
  const suggestedLocationLabel = location ? getDistrictStateLabel(location.label) : '';

  const toggleLocationMenu = () => {
    setIsLocationMenuOpen((prev) => {
      const next = !prev;
      if (!prev) {
        setLocationSearch(location ? getCityLabel(location.label) : '');
      }
      return next;
    });
  };

  const applyTypedLocation = async () => {
    const value = locationSearch.trim();
    if (value.length === 0) return;
    await setManualLocation(value);
    setIsLocationMenuOpen(false);
    setIsMobileLocationOpen(false);
  };

  const handleLocationInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyTypedLocation();
    }
  };

  const handleStoreLogout = () => {
    setStoreMenuOpen(false);
    logout({ redirectTo: '/auth' });
  };

  const trimmedLocationSearch = locationSearch.trim();

  const handleSuggestionSelect = useCallback(
    (suggestion: LocationSuggestion) => {
      setSuggestedLocation(suggestion);
      setLocationSearch(suggestion.city);
      setIsLocationMenuOpen(false);
      setIsMobileLocationOpen(false);
      setSuggestions([]);
    },
    [setSuggestedLocation]
  );

  useEffect(() => {
    if (!isLocationMenuOpen && !isMobileLocationOpen) {
      suggestionControllerRef.current?.abort();
      setIsFetchingSuggestions(false);
      return;
    }

    if (trimmedLocationSearch.length < 2) {
      suggestionControllerRef.current?.abort();
      setSuggestions([]);
      setIsFetchingSuggestions(false);
      return;
    }

    suggestionControllerRef.current?.abort();
    const controller = new AbortController();
    suggestionControllerRef.current = controller;
    setIsFetchingSuggestions(true);

    searchLocations(trimmedLocationSearch, 6, controller.signal)
      .then((results) => {
        if (!controller.signal.aborted) {
          setSuggestions(results);
        }
      })
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') {
          console.warn('Location suggestions failed', error);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetchingSuggestions(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [isLocationMenuOpen, isMobileLocationOpen, trimmedLocationSearch]);


  const suggestionRows = useMemo(() => {
    if (isFetchingSuggestions) {
      return [
        <div key="loading" className="px-3 py-2 text-xs text-gray-500">
          Searching for locations…
        </div>,
      ];
    }

    if (trimmedLocationSearch.length < 2) {
      return [
        <div key="hint" className="px-3 py-2 text-xs text-gray-500">
          Type at least 2 letters to see suggestions.
        </div>,
      ];
    }

    if (suggestions.length === 0) {
      return [
        <div key="empty" className="px-3 py-2 text-xs text-gray-500">
          No matching locations found.
        </div>,
      ];
    }

    return suggestions.map((suggestion) => (
      <button
        key={`${suggestion.latitude}-${suggestion.longitude}`}
        type="button"
        onClick={() => handleSuggestionSelect(suggestion)}
        className="w-full text-left px-2.5 py-1.5 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:px-3 md:py-2"
      >
        <p className="text-[12px] font-semibold leading-tight text-gray-900 md:text-sm">{suggestion.city}</p>
        <p className="text-[10px] leading-tight text-gray-500 md:text-xs">
          {[suggestion.district, suggestion.state].filter(Boolean).join(', ') || suggestion.label}
        </p>
      </button>
    ));
  }, [handleSuggestionSelect, isFetchingSuggestions, suggestions, trimmedLocationSearch]);

  const renderSuggestionList = () => (
    <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white/90 shadow-inner">
      {suggestionRows}
    </div>
  );

  const handleMobileNavNavigate = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (!storeMenuOpen) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (storeCtaRef.current && !storeCtaRef.current.contains(event.target as Node)) {
        setStoreMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setStoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [storeMenuOpen]);

  useEffect(() => {
    if (!isLocationMenuOpen) {
      return;
    }

    const closeIfOutside = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !locationMenuRef.current?.contains(target)) {
        setIsLocationMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsLocationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isLocationMenuOpen]);

  useEffect(() => {
    if (!isMobileLocationOpen || !isMenuOpen) {
      return;
    }

    const closeIfOutside = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || !mobileLocationSectionRef.current?.contains(target)) {
        setIsMobileLocationOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileLocationOpen(false);
      }
    };

    document.addEventListener('mousedown', closeIfOutside);
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMobileLocationOpen, isMenuOpen]);

  useEffect(() => {
    const anyLocationPanelOpen =
      isLocationMenuOpen || (isMobileLocationOpen && isMenuOpen);
    if (!anyLocationPanelOpen) {
      return;
    }

    const onScroll = () => {
      setIsLocationMenuOpen(false);
      setIsMobileLocationOpen(false);
    };

    const scrollOpts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('scroll', onScroll, scrollOpts);
    document.addEventListener('scroll', onScroll, scrollOpts);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    vv?.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll, scrollOpts);
      document.removeEventListener('scroll', onScroll, scrollOpts);
      vv?.removeEventListener('scroll', onScroll);
    };
  }, [isLocationMenuOpen, isMobileLocationOpen, isMenuOpen]);

  const handleStoreButtonClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isLoggedIn) {
      event.preventDefault();
      setStoreMenuOpen((prev) => !prev);
    }
  };

  const currentStoreSlug = selectedStore?.slug ?? user?.storeSlug ?? null;

  const storePrimaryCta = useMemo(() => {
    if (!isLoggedIn) {
      return {
        label: 'Create Store',
        href: '/auth',
      };
    }

    if (currentStoreSlug) {
      return {
        label: 'View Store',
        href: `/store/${currentStoreSlug}`,
      };
    }

    return {
      label: 'Finish Store Setup',
      href: '/create-store',
    };
  }, [currentStoreSlug, isLoggedIn]);

  const hasStore = Boolean(currentStoreSlug);

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-[100] border-b border-gray-200 bg-white shadow-sm">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex shrink-0 items-center">
            <Link href="/" className="flex items-center">
              <Image src={desktopLogo} alt="Larawans" className="h-6 w-auto object-contain md:h-10" priority />
            </Link>
          </div>

          <div className="min-w-0 flex-1" aria-hidden="true" />

          <div className="flex shrink-0 translate-x-1 items-center gap-0 md:translate-x-0 md:gap-3">
            <nav
              className="mr-1 hidden items-center gap-3 text-sm font-medium text-gray-700 md:flex lg:mr-2 lg:gap-6"
              aria-label="Main navigation"
            >
              <Link href="/" className="whitespace-nowrap transition hover:text-primary">
                {'Home'}
              </Link>
              <Link href="/all-stores" className="whitespace-nowrap transition hover:text-primary">
                {'All Store'}
              </Link>
              <Link href="/products" className="whitespace-nowrap transition hover:text-primary">
                {'Products'}
              </Link>
            </nav>

            <div className="relative" ref={locationMenuRef}>
              <button
                type="button"
                onClick={toggleLocationMenu}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] px-2 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 md:ml-0 md:h-[30px] md:gap-1.5 md:px-2.5 md:text-xs"
                translate="no"
              >
                <MapPin className="h-3.5 w-3.5 text-primary-700 md:h-4 md:w-4" />
                <span className="max-w-[48px] truncate font-medium md:hidden" translate="no">{locationChipLabel}</span>
                <span className="hidden md:inline font-medium whitespace-nowrap text-sm" translate="no">{locationChipLabel}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition md:h-4 md:w-4 ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLocationMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 max-w-[78vw] rounded-2xl border border-gray-200 bg-white p-2.5 shadow-lg md:w-48 md:max-w-[320px] md:rounded-xl md:p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gray-500 md:mb-3 md:text-xs md:tracking-widest">{'Choose location'}</p>
                  <div className="mb-2 md:mb-3">
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      onKeyDown={handleLocationInputKey}
                      placeholder={'Type city name...'}
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary md:px-3 md:text-sm"
                    />
                    {suggestedLocationLabel && (
                      <p className="mt-1 text-[10px] text-gray-500 md:text-[11px]">
                        {'Currently set to'}: {suggestedLocationLabel}
                      </p>
                    )}
                  </div>
                  {locationError && (
                    <p className="mb-2 text-[11px] text-red-500">{locationError}</p>
                  )}
                  {renderSuggestionList()}
                </div>
              )}
            </div>

            <div className="relative ml-1 flex items-center md:hidden">
              <LanguageToggle appearance="pill" className="h-8 px-2.5 text-[11px] min-h-0" showLabelOnMobile />
            </div>

            <div className="hidden items-center gap-2 text-sm md:flex md:gap-2.5">
              <LanguageToggle appearance="pill" showLabelOnDesktop />

              {isLoggedIn && currentStoreSlug ? (
                <Link
                  href={`/store/${currentStoreSlug}`}
                  className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-blue-500/30 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#0f172a_100%)] px-3 py-1 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-white" />
                  <span>{'My store'}</span>
                </Link>
              ) : null}

              {isLoggedIn ? (
                <div className="relative" ref={storeCtaRef}>
                  {hasStore ? (
                    <button
                      type="button"
                      onClick={() => setStoreMenuOpen((prev) => !prev)}
                      aria-label="Open store menu"
                      className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#0f172a_100%)] text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <ChevronDown className={`h-5 w-5 transition ${storeMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link
                      href={storePrimaryCta.href}
                      onClick={handleStoreButtonClick}
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#0f172a_100%)] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_14px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      <span>{storePrimaryCta.label}</span>
                    </Link>
                  )}
                  {storeMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                      {hasStore ? (
                        <>
                          <Link
                            href="/dashboard/products"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 transition"
                            onClick={() => setStoreMenuOpen(false)}
                          >
                            <PlusCircle className="h-4 w-4 text-primary" />
                            {'Add products'}
                          </Link>
                          <Link
                            href="/dashboard/notifications"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 transition"
                            onClick={() => setStoreMenuOpen(false)}
                          >
                            <Bell className="h-4 w-4 text-primary" />
                            {'Notifications'}
                          </Link>
                          <Link
                            href="/dashboard/subscription"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 transition"
                            onClick={() => setStoreMenuOpen(false)}
                          >
                            <CreditCard className="h-4 w-4 text-primary" />
                            {'Subscription'}
                          </Link>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 transition"
                            onClick={() => setStoreMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                            {'Dashboard'}
                          </Link>
                        </>
                      ) : null}
                      <button
                        onClick={handleStoreLogout}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        {'Logout'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="navbar-create-store-breathe-desktop flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                >
                  <User className="w-4 h-4" />
                  <span className="font-medium">{'Create Store'}</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2" ref={mobileLocationSectionRef}>
                <button
                  type="button"
                  onClick={() => setIsMobileLocationOpen((prev) => !prev)}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> {locationChipLabel}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${isMobileLocationOpen ? 'rotate-180' : ''}`} />
                </button>
                {isMobileLocationOpen && (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs uppercase text-gray-500 tracking-widest mb-2">{'Update location'}</p>
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(event) => setLocationSearch(event.target.value)}
                      onKeyDown={handleLocationInputKey}
                      placeholder={'Type city name...'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {locationError && (
                      <p className="text-xs text-red-500 mt-2">{locationError}</p>
                    )}
                    {renderSuggestionList()}
                  </div>
                )}
              </div>
              <Link href="/" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'Home'}
              </Link>
              <Link href="/all-stores" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'All Store'}
              </Link>
              <Link href="/#products" onClick={handleMobileNavNavigate} className="text-gray-700 hover:text-primary transition">
                {'Products'}
              </Link>

              {isLoggedIn ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href={hasStore ? `/store/${currentStoreSlug}` : '/create-store'}
                    onClick={handleMobileNavNavigate}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition text-center"
                  >
                    {hasStore ? 'View Store' : 'Finish Store Setup'}
                  </Link>
                  {/* Mobile: when "My store" is available, hide dashboard shortcut. */}
                  <button
                    onClick={() => {
                      handleStoreLogout();
                      handleMobileNavNavigate();
                    }}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded-lg text-center"
                  >
                    {'Logout'}
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={handleMobileNavNavigate}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition text-center"
                >
                  {'Create Store'}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
