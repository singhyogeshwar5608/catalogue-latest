'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { searchAll } from '@/src/lib/api';
import type { Product, Service, Store } from '@/types';

export type MarketplaceSearchBarProps = {
  /** Where Enter submits: `/?q=` (default) or `/all-stores?q=` etc. */
  submitPath?: '/' | '/all-stores';
  /** Extra classes on outer wrapper (default includes top margin). */
  wrapperClassName?: string;
  /** When false, disables realtime suggestions dropdown. */
  enableSuggestions?: boolean;
};

export default function MarketplaceSearchBar({
  submitPath = '/',
  wrapperClassName,
  enableSuggestions = false,
}: MarketplaceSearchBarProps = {}) {
  const { location } = useLocationContext();
  const { searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [serviceResults, setServiceResults] = useState<Service[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (!enableSuggestions) return;
    const query = localQuery.trim();
    if (!query) {
      setStoreResults([]);
      setProductResults([]);
      setServiceResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const searchResponse = await searchAll({
          query,
          location: location?.label ?? undefined,
          lat: typeof location?.latitude === 'number' ? location.latitude : undefined,
          lng: typeof location?.longitude === 'number' ? location.longitude : undefined,
          radiusKm:
            typeof location?.latitude === 'number' && typeof location?.longitude === 'number' ? 50 : undefined,
          limits: { stores: 6, products: 6, services: 6 },
        });
        if (cancelled) return;

        setStoreResults(searchResponse.stores);
        setProductResults(searchResponse.products);
        setServiceResults(searchResponse.services);

        const hasAny =
          searchResponse.stores.length > 0 ||
          searchResponse.products.length > 0 ||
          searchResponse.services.length > 0;
        setSearchError(
          hasAny ? null : `No matching stores, products, or services for “${query}” yet.`
        );
      } catch (error) {
        console.error('Marketplace search failed', error);
        setStoreResults([]);
        setProductResults([]);
        setServiceResults([]);
        setSearchError('Unable to search right now. Please try again.');
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [enableSuggestions, localQuery, location]);

  const trimmed = localQuery.trim();
  const hasResults = storeResults.length > 0 || productResults.length > 0 || serviceResults.length > 0;
  const showPopover = Boolean(trimmed && (isSearching || hasResults || searchError));
  const shouldShowPopover = isPopoverOpen && showPopover;

  useEffect(() => {
    if (!enableSuggestions) return;
    if (!isPopoverOpen) return;
    const handleClickAway = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [enableSuggestions, isPopoverOpen]);

  useEffect(() => {
    if (!enableSuggestions) return;
    if (!trimmed) setIsPopoverOpen(false);
  }, [enableSuggestions, trimmed]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const q = localQuery.trim();
    if (event.key === 'Enter' && q) {
      event.preventDefault();
      setSearchQuery(q);
      const href =
        submitPath === '/' ? `/?q=${encodeURIComponent(q)}` : `${submitPath}?q=${encodeURIComponent(q)}`;
      router.push(href);
    }
  };

  const wrapClass = wrapperClassName ?? 'mt-4 w-full sm:mt-5';

  return (
    <div className={wrapClass}>
      <div ref={wrapperRef} className="relative mx-auto w-full max-w-2xl">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70 sm:left-4 sm:h-5 sm:w-5" />
        <input
          type="search"
          value={localQuery}
          onChange={(event) => {
            const next = event.target.value;
            setLocalQuery(next);
            setSearchQuery(next);
            if (enableSuggestions) setIsPopoverOpen(Boolean(next.trim()));
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (enableSuggestions) setIsPopoverOpen(Boolean(localQuery.trim()));
          }}
          placeholder="Search stores or products..."
          className="w-full rounded-full border border-slate-800 bg-slate-900/95 py-[calc(0.22rem+3px)] pl-10 pr-2.5 text-[12px] font-medium text-white shadow-[0_12px_25px_-18px_rgba(15,23,42,0.8)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20 sm:py-[calc(0.375rem+2.5px)] sm:pl-11 sm:pr-3 sm:text-sm"
          autoComplete="off"
        />
        {enableSuggestions && shouldShowPopover && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-900/10">
            <div className="max-h-[28rem] overflow-y-auto pr-1">
              {isSearching ? (
                <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Searching for “{trimmed}”
                </div>
              ) : hasResults ? (
                <div className="space-y-4">
                  {storeResults.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Stores</p>
                        <span className="text-[11px] text-slate-400">{storeResults.length}</span>
                      </div>
                      <div className="space-y-2">
                        {storeResults.map((store) => (
                          <Link
                            key={store.id}
                            href={`/store/${store.username}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                          >
                            <div className="flex flex-1 flex-col">
                              <span className="text-sm font-semibold text-slate-900">{store.name}</span>
                              <span className="text-xs text-slate-500">
                                {[store.categoryName ?? store.businessType, store.location].filter(Boolean).join(' • ')}
                              </span>
                            </div>
                            {store.isVerified ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                Verified
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {productResults.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Products</p>
                        <span className="text-[11px] text-slate-400">{productResults.length}</span>
                      </div>
                      <div className="space-y-2">
                        {productResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/store/${product.storeSlug ?? product.storeId}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                          >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100">
                              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                              <span className="truncate text-sm font-semibold text-slate-900">{product.name}</span>
                              <span className="truncate text-[11px] text-slate-500">{product.storeName}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">₹{product.price}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {serviceResults.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Services</p>
                        <span className="text-[11px] text-slate-400">{serviceResults.length}</span>
                      </div>
                      <div className="space-y-2">
                        {serviceResults.map((service) => (
                          <Link
                            key={service.id}
                            href={`/store/${service.storeSlug ?? service.storeId}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-3.5 py-3 text-left transition hover:border-slate-200 hover:bg-slate-50"
                          >
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100">
                              <img src={service.image} alt={service.title} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                              <span className="truncate text-sm font-semibold text-slate-900">{service.title}</span>
                              <span className="truncate text-[11px] text-slate-500">{service.storeName}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-900">
                              {service.price != null ? `₹${service.price}` : 'Custom quote'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {searchError ?? 'No matches yet. Try a different keyword.'}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <span>Search across store names, product titles, services, and locations in real time.</span>
              <Link
                href={`/all-stores?q=${encodeURIComponent(trimmed)}`}
                onClick={() => setIsPopoverOpen(false)}
                className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                View all matches
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
