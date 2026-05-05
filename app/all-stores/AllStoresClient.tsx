'use client';

import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowUpDown, ChevronDown, Filter, MapPin } from 'lucide-react';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreCard from '@/components/StoreCard';
import { getAllStores } from '@/src/lib/api';
import { perfLog } from '@/src/lib/perfLog';
import MarketplaceSearchBar from '@/components/home/MarketplaceSearchBar';
import { useAuth } from '@/src/context/AuthContext';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { extractCityTokens } from '@/src/lib/location';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import { storeMatchesClientSearch } from '@/src/lib/storeSearchMatch';
import type { Store } from '@/types';

const createSlug = (value: string) =>
  value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DIRECTORY_BATCH_SIZE = 12;

export default function AllStoresClient({ initialStores }: { initialStores: Store[] }) {
  const [stores] = useState<Store[]>(initialStores);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [fallbackQueryUsed, setFallbackQueryUsed] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { location, isLoading: locationDetecting } = useLocationContext();
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersPanelRef = useRef<HTMLDivElement | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortPanelRef = useRef<HTMLDivElement | null>(null);
  const [sortOption, setSortOption] = useState<'relevance' | 'name-asc' | 'name-desc'>('relevance');
  const mobileHeaderRef = useRef<HTMLElement | null>(null);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(0);

  const [directoryVisibleCount, setDirectoryVisibleCount] = useState(DIRECTORY_BATCH_SIZE);
  const directorySentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    perfLog('all-stores', `client mounted (${initialStores.length} from server)`);
  }, [initialStores.length]);

  useEffect(() => {
    const q = searchParams.get('q')?.trim() ?? '';
    if (!q) return;
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams, searchQuery, setSearchQuery]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!filtersPanelRef.current?.contains(target)) {
        setFiltersOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (!sortOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (!sortPanelRef.current?.contains(target)) {
        setSortOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSortOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);

  useLayoutEffect(() => {
    const node = mobileHeaderRef.current;
    if (!node) return;

    const update = () => {
      setMobileHeaderHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);
    window.addEventListener('resize', update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      setFallbackQueryUsed(null);

      try {
        const combined: Record<string, Store> = {};
        const addStores = (items: Store[]) => {
          items.forEach((store) => {
            if (store.isActive && store.id && store.name) {
              combined[String(store.id)] = store;
            }
          });
        };

        if (location?.latitude && location?.longitude) {
          try {
            const coordStores = await getAllStores({
              lat: location.latitude,
              lng: location.longitude,
              radiusKm: 50,
              limit: 12,
            });
            addStores(coordStores);
          } catch (error) {
            console.warn('Coordinate-based fetch failed, trying fallback', error);
          }
        }

        if (location?.label) {
          const cityTokens = extractCityTokens(location.label);
          for (const token of cityTokens) {
            try {
              const labelStores = await getAllStores({ location: token, limit: 12 });
              addStores(labelStores);
              if (Object.keys(combined).length === 0) {
                setFallbackQueryUsed(token);
              }
              break;
            } catch (error) {
              console.warn(`Location query failed for token: ${token}`, error);
            }
          }
        }

        if (isMounted) {
          setNearbyStores(Object.values(combined).slice(0, 12));
        }
      } catch (error) {
        console.error('Failed to fetch nearby stores:', error);
        if (isMounted) {
          setNearbyError('Unable to load nearby stores. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setNearbyLoading(false);
        }
      }
    };

    if (location) {
      fetchNearby();
    } else {
      setNearbyStores([]);
      setNearbyLoading(false);
      setNearbyError(null);
      setFallbackQueryUsed(null);
    }

    return () => {
      isMounted = false;
    };
  }, [location]);

  const orderedStores = useMemo(() => prioritizeCurrentUserStore(stores, user), [stores, user]);

  const orderedNearbyStores = useMemo(
    () => prioritizeCurrentUserStore(nearbyStores, user),
    [nearbyStores, user]
  );

  const categoryOptions = useMemo(() => {
    const labels = Array.from(
      new Set(orderedStores.map((store) => (store.categoryName ?? store.businessType).trim()).filter(Boolean))
    );

    return labels.map((label) => ({ id: createSlug(label), label }));
  }, [orderedStores]);

  const selectedCount = selectedCategories.size;
  const selectedLabel = useMemo(() => {
    if (selectedCount === 0) return 'All categories';
    if (selectedCount === 1) {
      const only = Array.from(selectedCategories)[0];
      return categoryOptions.find((c) => c.id === only)?.label ?? '1 selected';
    }
    return `${selectedCount} selected`;
  }, [categoryOptions, selectedCategories, selectedCount]);

  const filteredStores = useMemo(() => {
    const result = orderedStores.filter((store) => {
      const categoryLabel = store.categoryName ?? store.businessType;
      const categorySlug = createSlug(categoryLabel);
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(categorySlug);
      if (!matchesCategory) return false;
      return storeMatchesClientSearch(store, searchQuery);
    });

    if (sortOption === 'name-asc') {
      return result.slice().sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }));
    }
    if (sortOption === 'name-desc') {
      return result
        .slice()
        .sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '', undefined, { sensitivity: 'base' }));
    }
    return result;
  }, [searchQuery, orderedStores, selectedCategories, sortOption]);

  const filteredNearbyStores = useMemo(() => {
    return orderedNearbyStores.filter((store) => storeMatchesClientSearch(store, searchQuery));
  }, [orderedNearbyStores, searchQuery]);

  const featuredStores = useMemo(
    () => filteredStores.filter((store) => store.isVerified || store.activeSubscription || store.isBoosted).slice(0, 3),
    [filteredStores]
  );

  const directoryStores = useMemo(() => {
    if (featuredStores.length === 0) return filteredStores;
    const featuredIds = new Set(featuredStores.map((store) => String(store.id)));
    return filteredStores.filter((store) => !featuredIds.has(String(store.id)));
  }, [filteredStores, featuredStores]);

  useLayoutEffect(() => {
    setDirectoryVisibleCount(Math.min(DIRECTORY_BATCH_SIZE, directoryStores.length));
  }, [searchQuery, orderedStores.length, user?.id, directoryStores.length, selectedCategories]);

  const visibleDirectoryStores = useMemo(
    () => directoryStores.slice(0, directoryVisibleCount),
    [directoryStores, directoryVisibleCount]
  );

  const hasMoreDirectory = directoryVisibleCount < directoryStores.length;

  const loadMoreDirectory = useCallback(() => {
    const total = directoryStores.length;
    setDirectoryVisibleCount((previous) => {
      if (previous >= total) return previous;
      return Math.min(previous + DIRECTORY_BATCH_SIZE, total);
    });
  }, [directoryStores.length]);

  useEffect(() => {
    if (!hasMoreDirectory) return;
    const node = directorySentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMoreDirectory();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMoreDirectory, loadMoreDirectory]);

  const renderResponsiveStoreGrid = (list: Store[]) => (
    <>
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {list.map((store) => (
          <div key={store.id} className="col-span-1 min-h-0 min-w-0 w-full">
            <StoreCard store={store} isCompact />
          </div>
        ))}
      </div>

      <div className="hidden grid-cols-1 gap-6 sm:grid lg:grid-cols-3">
        {list.map((store) => (
          <div key={store.id} className="min-h-0 w-full">
            <VerifiedSellerCard store={store} />
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <section
        className="fixed inset-x-0 z-50 w-full rounded-b-[20px] border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] sm:static sm:top-auto sm:inset-auto sm:mt-0 lg:mt-0"
        style={{ top: 'calc(4rem + var(--mobile-quick-search-height, 0px))' }}
        ref={mobileHeaderRef}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6 sm:py-2 lg:px-8 lg:py-3">
          <div className="flex w-full flex-col gap-3 sm:gap-4">
            <div className="flex w-full items-center gap-2">
              <MarketplaceSearchBar
                submitPath="/all-stores"
                enableSuggestions={false}
                wrapperClassName="flex-[1.35] min-w-0 sm:flex-1 sm:max-w-[720px]"
              />

              {/* Mobile: search + slide-in filters */}
              <div className="flex flex-shrink-0 items-center gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  aria-haspopup="dialog"
                  aria-expanded={mobileFiltersOpen}
                >
                  <Filter className="h-2.5 w-2.5" />
                  Filter
                </button>
              </div>

              {/* Desktop/tablet: dropdown filters + sort */}
              <div className="hidden flex-shrink-0 items-center gap-2 sm:flex">
                <div className="relative z-10" ref={filtersPanelRef}>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((open) => !open)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
                    aria-haspopup="menu"
                    aria-expanded={filtersOpen}
                  >
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Filter</span>
                    <span className="max-w-[90px] truncate text-slate-500 sm:max-w-[160px]">{selectedLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                  </button>

                  {filtersOpen ? (
                    <div
                      className="absolute left-0 right-0 z-[70] mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.6)] sm:left-auto sm:right-0"
                      role="menu"
                      aria-label="Category filters"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Categories</p>
                        <button
                          type="button"
                          onClick={() => setSelectedCategories(new Set())}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                          disabled={selectedCategories.size === 0}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-72 overflow-auto p-2">
                        {categoryOptions.length ? (
                          categoryOptions.map((category) => {
                            const checked = selectedCategories.has(category.id);
                            return (
                              <label
                                key={category.id}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50 sm:text-sm"
                              >
                                <span className="min-w-0 flex-1 truncate">{category.label}</span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const next = new Set(selectedCategories);
                                    if (event.target.checked) {
                                      next.add(category.id);
                                    } else {
                                      next.delete(category.id);
                                    }
                                    setSelectedCategories(next);
                                  }}
                                  className="h-4 w-4 accent-slate-900"
                                />
                              </label>
                            );
                          })
                        ) : (
                          <div className="px-3 py-6 text-center text-sm text-slate-500">No categories available</div>
                        )}
                      </div>
                      <div className="border-t border-slate-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setFiltersOpen(false)}
                          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative z-[60]" ref={sortPanelRef}>
                  <button
                    type="button"
                    onClick={() => setSortOpen((open) => !open)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
                    aria-haspopup="menu"
                    aria-expanded={sortOpen}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Sort</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" />
                  </button>

                  {sortOpen ? (
                    <div
                      className="absolute right-0 z-[70] mt-2 w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.6)]"
                      role="menu"
                      aria-label="Sort options"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Sort by</p>
                      </div>
                      <div className="p-2">
                        {(
                          [
                            { id: 'relevance', label: 'Default' },
                            { id: 'name-asc', label: 'Name: A to Z' },
                            { id: 'name-desc', label: 'Name: Z to A' },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSortOption(option.id);
                              setSortOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-slate-50 sm:text-sm ${
                              sortOption === option.id ? 'bg-slate-50 text-slate-950' : 'text-slate-700'
                            }`}
                          >
                            <span className="truncate">{option.label}</span>
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                sortOption === option.id ? 'bg-slate-900' : 'border border-slate-300'
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile filters drawer */}
      <div
        className={`fixed inset-0 z-[110] sm:hidden ${mobileFiltersOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileFiltersOpen}
      >
        <div
          className={`absolute inset-0 bg-slate-950/30 transition-opacity ${mobileFiltersOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileFiltersOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className={`absolute right-0 top-0 h-full w-[min(340px,92vw)] bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.7)] transition-transform ${
            mobileFiltersOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <p className="text-base font-semibold text-slate-900">Filters</p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <p className="text-sm font-semibold text-slate-900">Categories</p>
              <button
                type="button"
                onClick={() => setSelectedCategories(new Set())}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                disabled={selectedCategories.size === 0}
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-auto px-2 pb-4">
              {categoryOptions.length ? (
                categoryOptions.map((category) => {
                  const checked = selectedCategories.has(category.id);
                  return (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3 text-[12px] text-slate-700 hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1 truncate">{category.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const next = new Set(selectedCategories);
                          if (event.target.checked) {
                            next.add(category.id);
                          } else {
                            next.delete(category.id);
                          }
                          setSelectedCategories(next);
                        }}
                        className="h-4 w-4 accent-slate-900"
                      />
                    </label>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No categories available</div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className="sm:hidden"
        style={{
          height:
            mobileHeaderHeight ? `${mobileHeaderHeight}px` : '0px',
        }}
        aria-hidden="true"
      />

      <section className="mx-auto max-w-7xl px-4 pb-0 pt-3 sm:px-6 sm:pt-3 sm:pb-14 lg:px-8 lg:pb-20">
        {filteredStores.length ? (
          <div className="space-y-10">
            {featuredStores.length ? (
              <div className="space-y-4 pt-1 sm:mt-[5px] sm:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-xl">
                      Verified sellers
                    </h2>
                    <p className="mt-1 hidden text-[11px] leading-5 text-slate-500 sm:block sm:text-sm">
                      Stores with verification, active plan, or boosted visibility.
                    </p>
                  </div>
                  <Link
                    href="#all-stores"
                    className="sm:hidden inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    All stores
                  </Link>
                </div>
                {renderResponsiveStoreGrid(featuredStores)}
              </div>
            ) : null}

            <div>
              {featuredStores.length ? (
                <div id="all-stores" className="mb-4 flex items-end justify-between gap-4 scroll-mt-24">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-xl">All stores</h2>
                    <p className="mt-1 hidden text-[11px] leading-5 text-slate-500 sm:block sm:text-sm">
                      Browse every store in the directory.
                    </p>
                  </div>
                </div>
              ) : null}
              {renderResponsiveStoreGrid(visibleDirectoryStores)}
              {hasMoreDirectory ? (
                <div ref={directorySentinelRef} className="py-6 text-center text-sm text-slate-500">
                  Scroll to load more stores
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-xl font-semibold text-slate-950">No stores found</p>
            <p className="mt-2 text-slate-500">Try changing the category or clearing your search.</p>
          </div>
        )}
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-6 sm:mt-0 sm:px-6 sm:pb-14 lg:px-8 lg:pb-20">
        <div className="mb-7 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {locationDetecting ? 'Detecting your area...' : 'Near By'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {location ? location.label : 'Set your location from the header'}
            </p>
          </div>
        </div>

        {nearbyLoading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-4 py-20 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="mt-4 text-sm font-medium text-slate-500">Loading nearby stores...</p>
          </div>
        ) : nearbyError ? (
          <div className="rounded-[28px] border border-red-200 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-sm text-red-600">{nearbyError}</p>
          </div>
        ) : filteredNearbyStores.length > 0 ? (
          renderResponsiveStoreGrid(filteredNearbyStores)
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-sm">
            <p className="text-slate-500">
              {searchQuery.trim()
                ? 'No nearby stores match your search in this area.'
                : location
                  ? 'No nearby stores found within 50 km right now.'
                : 'Use the location selector in the header to see nearby stores here.'}
            </p>
          </div>
        )}

        {fallbackQueryUsed ? (
          <p className="mt-4 text-center text-xs text-slate-400">Showing nearby results for: {fallbackQueryUsed}</p>
        ) : null}
      </section>
    </div>
  );
}
