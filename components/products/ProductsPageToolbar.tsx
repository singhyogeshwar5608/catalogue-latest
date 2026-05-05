'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Filter, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { searchAll } from '@/src/lib/api';
import type { Product, Service, Store } from '@/types';

export type ProductsFilterKind = 'all' | 'products' | 'services';
export type ProductsSortKey = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

type Props = {
  filterKind: ProductsFilterKind;
  inStockOnly: boolean;
  onFilterKindChange: (v: ProductsFilterKind) => void;
  onInStockOnlyChange: (v: boolean) => void;
  sortKey: ProductsSortKey;
  onSortKeyChange: (v: ProductsSortKey) => void;
};

export default function ProductsPageToolbar({
  filterKind,
  inStockOnly,
  onFilterKindChange,
  onInStockOnlyChange,
  sortKey,
  onSortKeyChange,
}: Props) {
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
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
          hasAny ? null : `No matching stores, products, or services for “${query}” yet.`,
        );
      } catch (error) {
        console.error('Products toolbar search failed', error);
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
  }, [localQuery, location]);

  const trimmed = localQuery.trim();
  const hasResults = storeResults.length > 0 || productResults.length > 0 || serviceResults.length > 0;
  const showPopover = Boolean(trimmed && (isSearching || hasResults || searchError));
  const shouldShowPopover = isPopoverOpen && showPopover;

  useEffect(() => {
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
  }, [isPopoverOpen]);

  useEffect(() => {
    if (!trimmed) setIsPopoverOpen(false);
  }, [trimmed]);

  useEffect(() => {
    if (!filterOpen && !sortOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (filterRef.current?.contains(t) || sortRef.current?.contains(t)) return;
      setFilterOpen(false);
      setSortOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpen, sortOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const q = localQuery.trim();
    if (event.key === 'Enter' && q) {
      event.preventDefault();
      setSearchQuery(q);
      router.push(`/products?q=${encodeURIComponent(q)}`);
      setIsPopoverOpen(false);
    }
  };

  const pillBtn =
    'inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-900 bg-white px-2.5 py-[6.5px] text-xs font-semibold leading-tight text-slate-900 shadow-sm transition hover:bg-slate-50 sm:gap-1.5 sm:px-3 sm:py-[8.5px] sm:text-sm';

  return (
    <div className="mb-4 flex min-w-0 flex-nowrap items-stretch gap-2 sm:mb-5">
      <div ref={wrapperRef} className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3.5 sm:h-[18px] sm:w-[18px]" />
        <input
          type="search"
          value={localQuery}
          onChange={(event) => {
            const next = event.target.value;
            setLocalQuery(next);
            setSearchQuery(next);
            setIsPopoverOpen(Boolean(next.trim()));
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsPopoverOpen(Boolean(localQuery.trim()))}
          placeholder="Search products, services..."
          className="w-full min-w-0 rounded-full border border-slate-200 bg-white py-[6.5px] pl-9 pr-3 text-sm leading-tight text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200/80 sm:py-[8.5px] sm:pl-10 sm:pr-4"
          autoComplete="off"
          aria-label="Search products and services"
        />
        {shouldShowPopover && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[min(28rem,70vh)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="max-h-[min(26rem,65vh)] overflow-y-auto p-3">
              {isSearching ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Searching…
                </div>
              ) : hasResults ? (
                <div className="space-y-3">
                  {storeResults.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Stores
                      </p>
                      <div className="space-y-1.5">
                        {storeResults.map((store) => (
                          <Link
                            key={store.id}
                            href={`/store/${store.username}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            <span className="font-semibold text-slate-900">{store.name}</span>
                            <span className="ml-auto truncate text-xs text-slate-500">
                              {store.location}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {productResults.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Products
                      </p>
                      <div className="space-y-1.5">
                        {productResults.map((product) => (
                          <Link
                            key={product.id}
                            href={`/product/${product.id}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                          >
                            <span className="truncate text-sm font-medium text-slate-900">{product.name}</span>
                            <span className="text-xs text-slate-500">{product.storeName}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {serviceResults.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Services
                      </p>
                      <div className="space-y-1.5">
                        {serviceResults.map((service) => (
                          <Link
                            key={service.id}
                            href={`/store/${service.storeSlug ?? service.storeId}`}
                            onClick={() => setIsPopoverOpen(false)}
                            className="block rounded-xl border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            {service.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
                  {searchError ?? 'No matches yet.'}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/90 px-3 py-2 text-[11px] text-slate-500">
              Matches store name, location, product &amp; service titles — same as home search.
            </div>
          </div>
        )}
      </div>

      <div className="relative shrink-0" ref={filterRef}>
        <button
          type="button"
          className={pillBtn}
          aria-expanded={filterOpen}
          onClick={() => {
            setSortOpen(false);
            setFilterOpen((o) => !o);
          }}
        >
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Filter
        </button>
        {filterOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Show</p>
            {(['all', 'products', 'services'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  filterKind === k ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
                onClick={() => {
                  onFilterKindChange(k);
                  setFilterOpen(false);
                }}
              >
                {k === 'all' ? 'All' : k === 'products' ? 'Products only' : 'Services only'}
              </button>
            ))}
            <div className="mx-2 my-1 border-t border-slate-100" />
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => onInStockOnlyChange(e.target.checked)}
                className="rounded border-slate-300"
              />
              In stock only
            </label>
          </div>
        ) : null}
      </div>

      <div className="relative shrink-0" ref={sortRef}>
        <button
          type="button"
          className={pillBtn}
          aria-expanded={sortOpen}
          onClick={() => {
            setFilterOpen(false);
            setSortOpen((o) => !o);
          }}
        >
          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          Sort
        </button>
        {sortOpen ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
            {(
              [
                ['default', 'Default'],
                ['price-asc', 'Price: low to high'],
                ['price-desc', 'Price: high to low'],
                ['name-asc', 'Name: A–Z'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm ${
                  sortKey === key ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
                }`}
                onClick={() => {
                  onSortKeyChange(key);
                  setSortOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
