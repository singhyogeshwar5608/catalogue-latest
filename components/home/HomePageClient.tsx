'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Shield, TrendingUp, Smile, Store as StoreIcon, Star } from 'lucide-react';
import StoreCard from '@/components/StoreCard';
import TrendingProductsRail from '@/components/TrendingProductsRail';
import SectionHeader from '@/components/SectionHeader';
import HeroBanner from '@/components/HeroBanner';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreBrowseFilters, { type StoreBrowseSortOption } from '@/components/home/StoreBrowseFilters';
import StoreExplorer, { createCategorySlug, getStoreCategoryOptions } from '@/components/home/StoreExplorer';
import {
  getAllStores,
  getFollowedStores,
  getTrendingProducts,
  searchAll,
  type TrendingProductRailItem,
} from '@/src/lib/api';
import type { Product, Service, Store } from '@/types';
import { useLocationContext } from '@/src/context/LocationContext';
import { useSearch } from '@/src/context/SearchContext';
import { useAuth } from '@/src/context/AuthContext';
import { extractCityTokens } from '@/src/lib/location';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import { storeMatchesClientSearchOrApiStores } from '@/src/lib/storeSearchMatch';
import { haversineKm, parseCoord, parseDistanceKm } from '@/src/lib/geo';
import { parseViewerLatLng } from '@/src/lib/distanceUi';

const FOLLOWING_SECTION_PREVIEW_COUNT = 6;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function trendingItemMatchesSearch(item: TrendingProductRailItem, query: string): boolean {
  const raw = query.trim();
  if (!raw) return true;
  const q = raw.toLowerCase();

  const includes = (value: unknown) =>
    typeof value === 'string' && value.trim() !== '' && value.toLowerCase().includes(q);

  if (
    includes(item.name) ||
    includes(item.description) ||
    includes(item.category) ||
    includes(item.storeName) ||
    includes(item.storeUsername)
  ) {
    return true;
  }

  if (Number.isFinite(item.price)) {
    const priceStr = String(item.price);
    if (priceStr.includes(raw) || priceStr.includes(q)) return true;
  }

  const qDigits = digitsOnly(raw);
  if (qDigits.length >= 2) {
    const storeDigits = digitsOnly(String((item as TrendingProductRailItem & { whatsapp?: string }).whatsapp ?? ''));
    if (storeDigits && storeDigits.includes(qDigits)) return true;
  }

  return false;
}

type Props = {
  initialStores: Store[];
  initialPaidStores: Store[];
  initialTrendingProducts: TrendingProductRailItem[];
};

export default function HomePageClient({
  initialStores,
  initialPaidStores,
  initialTrendingProducts,
}: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [fallbackQueryUsed, setFallbackQueryUsed] = useState<string | null>(null);
  const [followedStores, setFollowedStores] = useState<Store[]>([]);
  const { location, isLoading: locationDetecting } = useLocationContext();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOption, setSortOption] = useState<StoreBrowseSortOption>('relevance');
  const [followingExpanded, setFollowingExpanded] = useState(false);
  const [trendingRail, setTrendingRail] = useState<TrendingProductRailItem[]>(initialTrendingProducts);
  const [homeSearchStoreIds, setHomeSearchStoreIds] = useState<ReadonlySet<string>>(() => new Set());
  const [homeSearchPrimaryStoreId, setHomeSearchPrimaryStoreId] = useState<string | null>(null);
  const [homeSearchRail, setHomeSearchRail] = useState<TrendingProductRailItem[]>([]);

  // Server already loaded the list (same path as /all-stores). Only fetch client-side if the server had nothing to show.
  useEffect(() => {
    if (initialStores.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const allStores = await getAllStores({ limit: 50 });
        if (!cancelled) {
          setStores(allStores);
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialStores.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await getFollowedStores();
      if (!cancelled) {
        setFollowedStores(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (initialTrendingProducts.length > 0) return;
    let cancelled = false;
    void getTrendingProducts(24).then((rows) => {
      if (!cancelled && rows.length > 0) {
        setTrendingRail(rows);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initialTrendingProducts.length]);

  // Handle URL search parameters
  useEffect(() => {
    const q = searchParams?.get('q');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams, setSearchQuery]);

  useEffect(() => {
    if (searchQuery.trim() !== '' && activeCategory !== 'all') {
      setActiveCategory('all');
    }
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setHomeSearchStoreIds(new Set());
      setHomeSearchPrimaryStoreId(null);
      setHomeSearchRail([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await searchAll({
            query: q,
            ...(location?.label ? { location: location.label } : {}),
            ...(typeof location?.latitude === 'number' && typeof location?.longitude === 'number'
              ? { lat: location.latitude, lng: location.longitude, radiusKm: 75 }
              : {}),
            limits: { stores: 50, products: 40, services: 40 },
          });
          if (cancelled) return;
          const ids = new Set<string>();
          const directStoreIds: string[] = [];
          const searchRail: TrendingProductRailItem[] = [];
          for (const s of res.stores) {
            if (s?.id != null && s.id !== '') {
              const id = String(s.id);
              ids.add(id);
              directStoreIds.push(id);
            }
          }
          for (const p of res.products) {
            if (p?.storeId != null && p.storeId !== '') {
              ids.add(String(p.storeId));
            }
            const storeId = p?.storeId != null ? String(p.storeId) : '';
            const storeUsername = typeof p?.storeSlug === 'string' && p.storeSlug.trim() ? p.storeSlug.trim() : undefined;
            searchRail.push({ ...(p as TrendingProductRailItem), storeUsername, storeId });
          }
          for (const svc of res.services) {
            if (svc?.storeId != null && svc.storeId !== '') ids.add(String(svc.storeId));
            searchRail.push({
              id: `service-${svc.id}`,
              storeId: svc.storeId,
              storeName: svc.storeName,
              storeSlug: svc.storeSlug,
              name: svc.title,
              description: svc.description,
              price: svc.price ?? 0,
              originalPrice: undefined,
              image: svc.image,
              images: [svc.image],
              category: 'Service',
              rating: 0,
              totalReviews: 0,
              inStock: svc.isActive,
              storeUsername: svc.storeSlug,
              storeLatitude: svc.storeLatitude,
              storeLongitude: svc.storeLongitude,
            });
          }
          setHomeSearchStoreIds(ids);
          setHomeSearchPrimaryStoreId(directStoreIds.length === 1 ? directStoreIds[0] : null);
          setHomeSearchRail(searchRail);
        } catch {
          if (!cancelled) setHomeSearchStoreIds(new Set());
          if (!cancelled) setHomeSearchPrimaryStoreId(null);
          if (!cancelled) setHomeSearchRail([]);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, location?.label, location?.latitude, location?.longitude]);

  useEffect(() => {
    let isMounted = true;
    const fetchNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      setFallbackQueryUsed(null);
      try {
        const normalizeToken = (value: string) =>
          value
            .toLowerCase()
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const includesToken = (haystack: unknown, token: string) =>
          typeof haystack === 'string' && normalizeToken(haystack).includes(token);
        const primaryCityToken = (() => {
          const label = location?.label;
          if (!label) return null;
          const tokens = extractCityTokens(label).map(normalizeToken).filter(Boolean);
          return tokens[0] ?? null;
        })();

        const matchesPrimaryCity = (store: Store): boolean => {
          if (!primaryCityToken) return true;
          const district = (store.district ?? '').toString();
          const state = (store.state ?? '').toString();
          // Prefer structured fields if present; otherwise fall back to the rendered location/address string.
          if (district && normalizeToken(district) === primaryCityToken) return true;
          if (includesToken(district, primaryCityToken)) return true;
          if (includesToken(state, primaryCityToken)) return true;
          return includesToken((store as Store & { location?: string }).location ?? store.location, primaryCityToken);
        };

        const combined: Record<string, Store> = {};
        const addStores = (items: Store[]) => {
          items.forEach((store) => {
            if (store.isActive && store.id && store.name) {
              combined[store.id] = store;
            }
          });
        };

        const viewerLL = parseViewerLatLng(location);
        const kmFromViewer = (store: Store): number | null => {
          const fromApi = parseDistanceKm(store.distanceKm);
          if (fromApi != null) return fromApi;
          if (!viewerLL) return null;
          const slat = parseCoord(store.latitude);
          const slng = parseCoord(store.longitude);
          if (slat == null || slng == null) return null;
          const km = haversineKm({ lat: viewerLL.lat, lng: viewerLL.lng }, { lat: slat, lng: slng });
          return Number.isFinite(km) ? km : null;
        };

        const within50Km = (store: Store): boolean => {
          const km = kmFromViewer(store);
          // If the store is not pinned (no coords, no API distance), keep it when it matches the selected city token.
          // Otherwise the "Near You" list becomes empty even when the city has stores.
          if (km == null) return true;
          return km <= 50;
        };

        if (typeof location?.latitude === 'number' && typeof location?.longitude === 'number') {
          try {
            const coordStores = await getAllStores({
              lat: location.latitude,
              lng: location.longitude,
              radiusKm: 50,
              limit: 200,
            });
            addStores(coordStores);
          } catch (err) {
            console.warn('Coordinate-based fetch failed, trying fallback', err);
          }
        }

        if (location?.label) {
          const cityTokens = extractCityTokens(location.label);
          for (const token of cityTokens) {
            try {
              const beforeCount = Object.keys(combined).length;
              const labelStores = await getAllStores({ location: token, limit: 200 });
              addStores(labelStores);
              const afterCount = Object.keys(combined).length;
              // Stop at the first token that yields any stores; otherwise keep trying other tokens.
              if (afterCount > beforeCount) {
                // Mark which token helped only if coordinate search didn't already yield results.
                if (beforeCount === 0) {
                  setFallbackQueryUsed(token);
                }
                break;
              }
            } catch (err) {
              console.warn(`Location query failed for token: ${token}`, err);
            }
          }
        }

        if (isMounted) {
          const finalStores = Object.values(combined)
            // If we have a city token but no coords/distance, keep stores that match the token.
            // If we have distance, use the 50km rule.
            .filter((store) => {
              const km = kmFromViewer(store);
              if (km != null) return km <= 50;
              return matchesPrimaryCity(store);
            })
            .sort((a, b) => {
              const ak = kmFromViewer(a);
              const bk = kmFromViewer(b);
              if (ak == null && bk == null) return 0;
              if (ak == null) return 1;
              if (bk == null) return -1;
              return ak - bk;
            });
          setNearbyStores(finalStores);
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
    }

    return () => {
      isMounted = false;
    };
  }, [location]);

  const orderedStores = useMemo(() => prioritizeCurrentUserStore(stores, user), [stores, user]);
  const storeCategoryOptions = useMemo(() => getStoreCategoryOptions(orderedStores), [orderedStores]);

  const orderedNearbyStores = useMemo(
    () => prioritizeCurrentUserStore(nearbyStores, user),
    [nearbyStores, user]
  );

  /** Paid-plan stores from Laravel `paid_subscription=1` (not inferred from lightweight list rows). */
  const paidPlanSellers = useMemo(
    () => prioritizeCurrentUserStore(initialPaidStores, user),
    [initialPaidStores, user]
  );

  const orderedFollowedStores = useMemo(
    () => prioritizeCurrentUserStore(followedStores, user),
    [followedStores, user]
  );

  const filteredFollowedStores = useMemo(
    () =>
      orderedFollowedStores.filter((store) =>
        storeMatchesClientSearchOrApiStores(store, searchQuery, homeSearchStoreIds)
      ),
    [orderedFollowedStores, searchQuery, homeSearchStoreIds]
  );

  const followingStoresVisible = useMemo(
    () =>
      followingExpanded
        ? filteredFollowedStores
        : filteredFollowedStores.slice(0, FOLLOWING_SECTION_PREVIEW_COUNT),
    [followingExpanded, filteredFollowedStores]
  );

  useEffect(() => {
    if (filteredFollowedStores.length <= FOLLOWING_SECTION_PREVIEW_COUNT) {
      setFollowingExpanded(false);
    }
  }, [filteredFollowedStores.length]);

  const filteredNearbyStores = useMemo(
    () =>
      orderedNearbyStores.filter((store) =>
        storeMatchesClientSearchOrApiStores(store, searchQuery, homeSearchStoreIds)
      ),
    [orderedNearbyStores, searchQuery, homeSearchStoreIds]
  );

  const filteredPaidPlanSellers = useMemo(
    () =>
      paidPlanSellers.filter((store) =>
        storeMatchesClientSearchOrApiStores(store, searchQuery, homeSearchStoreIds)
      ),
    [paidPlanSellers, searchQuery, homeSearchStoreIds]
  );

  const filteredStoresByCategory = useMemo(() => {
    let filtered = orderedStores;

    if (activeCategory !== 'all') {
      filtered = filtered.filter((store) => {
        const cat = (store.categoryName || store.businessType || '').toLowerCase();
        const slug = createCategorySlug(activeCategory);
        return createCategorySlug(cat) === slug;
      });
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((store) =>
        storeMatchesClientSearchOrApiStores(store, searchQuery, homeSearchStoreIds)
      );
    }

    if (sortOption === 'name-asc') {
      return filtered
        .slice()
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }));
    }
    if (sortOption === 'name-desc') {
      return filtered
        .slice()
        .sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '', undefined, { sensitivity: 'base' }));
    }
    return filtered;
  }, [orderedStores, activeCategory, searchQuery, homeSearchStoreIds, sortOption]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const locationLabel = location?.label || '';
  const trendingProductsFallback = useMemo(
    () =>
      orderedStores.flatMap((store) => {
        const storeProducts = (store.products ?? []).map((product: Product) => ({
          ...product,
          storeUsername: store.username,
          whatsapp: store.whatsapp,
        }));

        const storeServices = (store.services ?? []).map((service: Service) => ({
          id: `service-${service.id}`,
          storeId: service.storeId,
          storeName: service.storeName,
          name: service.title,
          description: service.description,
          price: service.price ?? 0,
          originalPrice: undefined,
          image: service.image,
          images: [service.image],
          category: 'Service',
          rating: 0,
          totalReviews: 0,
          inStock: service.isActive,
          storeUsername: store.username,
          whatsapp: store.whatsapp,
        }));

        return [...storeProducts, ...storeServices];
      }),
    [orderedStores]
  );

  const trendingProducts = useMemo(() => {
    if (trendingRail.length > 0) return trendingRail;
    return trendingProductsFallback;
  }, [trendingRail, trendingProductsFallback]);

  const filteredTrendingProducts = useMemo(() => {
    const q = searchQuery.trim();
    const hasQuery = q.length > 0;
    const hasStoreMatches = homeSearchStoreIds.size > 0;

    // Home store search UX: if the store grid is being filtered by the query, restrict trending items
    // to only those visible stores (so "Trending products" doesn't show unrelated cities).
    if (hasQuery) {
      const visibleStoreIdSet = new Set(
        orderedStores
          .filter((store) => {
            if (activeCategory === 'all') return true;
            const cat = (store.categoryName || store.businessType || '').toLowerCase();
            const slug = createCategorySlug(activeCategory);
            return createCategorySlug(cat) === slug;
          })
          .filter((store) => storeMatchesClientSearchOrApiStores(store, q, homeSearchStoreIds))
          .map((store) => String(store.id))
      );

      if (visibleStoreIdSet.size > 0) {
        const base: TrendingProductRailItem[] = trendingProductsFallback.filter(
          (p) => p.storeId != null && visibleStoreIdSet.has(String(p.storeId))
        ) as TrendingProductRailItem[];

        // Merge extra items from API search payload that belong to those visible stores.
        const extra = homeSearchRail.filter(
          (p) => p.storeId != null && visibleStoreIdSet.has(String(p.storeId))
        );
        const seen = new Set(base.map((p) => String(p.id)));
        for (const item of extra) {
          const key = String(item.id);
          if (!seen.has(key)) {
            seen.add(key);
            base.push(item);
          }
        }
        return base;
      }
    }

    // Store search: show all matched stores' products/services (query text ko override na kare).
    if (hasStoreMatches) {
      const storeIdSet = homeSearchStoreIds;
      // Use fallback products/services built from the store payload, not the generic trending rail.
      // This ensures mobile-number matches still show matched store catalog items even when the API
      // doesn't return rail rows for those stores.
      const base: TrendingProductRailItem[] = trendingProductsFallback.filter(
        (p) => p.storeId != null && storeIdSet.has(String(p.storeId))
      ) as TrendingProductRailItem[];

      if (!hasQuery) return base;

      // Add any additional items from the API search payload that belong to those matched stores.
      const extra = homeSearchRail.filter(
        (p) => p.storeId != null && storeIdSet.has(String(p.storeId))
      );
      const seen = new Set(base.map((p) => String(p.id)));
      for (const item of extra) {
        const key = String(item.id);
        if (!seen.has(key)) {
          seen.add(key);
          base.push(item);
        }
      }
      return base;
    }

    // Direct product/service search: show actual matches (across stores) if API returned any.
    if (hasQuery && homeSearchRail.length > 0) {
      const matches = homeSearchRail.filter((p) => trendingItemMatchesSearch(p, q));
      if (matches.length > 0) return matches;
    }

    // Default: filter trending rail itself.
    return trendingProducts.filter((p) => trendingItemMatchesSearch(p, q));
  }, [
    activeCategory,
    orderedStores,
    homeSearchStoreIds,
    trendingProductsFallback,
    trendingProducts,
    homeSearchRail,
    searchQuery,
  ]);

  /** Card banners: stable variant per store id via getStoreBannerImage (not position in this list). */
  const renderResponsiveStoreGrid = (
    list: Store[],
    showMobileAllStoresButton = false,
    gridOptions?: { mobileMaxItems?: number | null; forceVerifiedBadge?: boolean }
  ) => {
    const mobileCap = gridOptions?.mobileMaxItems;
    const mobileList = mobileCap === null ? list : list.slice(0, mobileCap ?? 7);
    const forceVerifiedBadge = Boolean(gridOptions?.forceVerifiedBadge);
    return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {mobileList.map((store) => (
          <div key={store.id} className="col-span-1 min-h-0 min-w-0 w-full">
            <StoreCard store={store} isCompact forceVerifiedBadge={forceVerifiedBadge} />
          </div>
        ))}
      </div>

      {showMobileAllStoresButton ? (
        <div className="mt-[10px] flex justify-center sm:hidden">
          <Link
            href="/all-stores"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            All Stores
          </Link>
        </div>
      ) : null}

      <div className="hidden grid-cols-1 gap-6 sm:grid md:grid-cols-2 lg:grid-cols-3">
        {list.map((store) => (
          <div key={store.id} className="min-h-0 w-full">
            <VerifiedSellerCard store={store} forceVerifiedBadge={forceVerifiedBadge} />
          </div>
        ))}
      </div>
    </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <HeroBanner />

      <section className="relative overflow-hidden px-5 py-6 sm:py-8 lg:py-10">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(251,191,36,0.18),transparent_50%),radial-gradient(ellipse_80%_60%_at_100%_50%,rgba(45,212,191,0.12),transparent_45%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(167,139,250,0.1),transparent_40%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-amber-200/30 blur-[100px]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-teal-300/25 blur-[90px] opacity-90"
          style={{ animationDelay: '1.2s' }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
            }}
          >
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="text-center text-[1.32rem] font-semibold leading-tight tracking-tight text-slate-900 sm:mt-0 sm:text-left sm:text-4xl lg:text-[2.35rem]"
            >
              <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                Shop local. Live better.
              </span>
            </motion.h2>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="mx-auto mt-4 max-w-2xl text-center text-[0.76rem] font-medium leading-relaxed text-slate-600 sm:mx-0 sm:text-left sm:text-base"
            >
              Discover trusted neighbourhood stores, get doorstep support, and shop confidently with honest
              reviews from real customers across {locationLabel || 'your area'}.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-10 hidden gap-4 sm:mt-12 sm:grid sm:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-950 via-cyan-950 to-blue-950 p-5 shadow-[0_20px_50px_-18px_rgba(8,47,73,0.75)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(34,211,238,0.35)]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"
                aria-hidden
              />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sky-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Verified Local Sellers</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-sky-100/90">
                Every marketplace partner is hand-checked for quality, pricing transparency, and reliable service.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 p-5 shadow-[0_20px_50px_-18px_rgba(6,78,59,0.78)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(52,211,153,0.35)]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-emerald-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Same-Day Assistance</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-emerald-100/90">
                Need exchanges, returns, or delivery help? Our {locationLabel || 'local'} support desk is just a
                tap away 7 days a week.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 28 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-5 shadow-[0_20px_50px_-18px_rgba(76,29,149,0.78)] ring-1 ring-white/10 transition-shadow duration-300 hover:shadow-[0_28px_60px_-20px_rgba(167,139,250,0.35)]"
            >
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-violet-200 shadow-inner ring-1 ring-white/15 transition-transform duration-300 group-hover:scale-105">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="relative text-sm font-semibold text-white">Smart Reviews & Ratings</p>
              <p className="relative mt-1.5 text-sm leading-relaxed text-violet-100/90">
                Real shoppers share photos, ratings, and tips so you know exactly what to expect before you
                order.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="relative mt-8 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 px-3 py-3 text-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.92)] ring-1 ring-slate-700/55 backdrop-blur-sm sm:mt-10 sm:rounded-[28px] sm:border-white/20 sm:px-6 sm:py-7 sm:shadow-[0_28px_70px_-28px_rgba(15,23,42,0.95)] sm:ring-slate-700/60 lg:mt-12"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-violet-500/10"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
              aria-hidden
            />

            <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:justify-between sm:gap-8 lg:items-center">
              <div className="text-center sm:max-w-[min(100%,22rem)] sm:text-left lg:max-w-md">
                <p className="mx-auto max-w-[20rem] text-sm font-normal leading-normal tracking-normal text-white sm:mx-0 sm:max-w-none sm:text-base md:text-lg">
                  Loved by shoppers across {locationLabel || 'India'}
                </p>
              </div>

              <div className="grid w-full grid-cols-3 divide-x divide-white/15 sm:w-auto sm:min-w-0 sm:max-w-2xl sm:flex-1 sm:gap-0">
                <motion.div
                  className="flex min-w-0 flex-col items-center gap-[0.2875rem] px-1 py-0 text-center sm:flex-col sm:items-start sm:justify-center sm:gap-[0.2875rem] sm:px-4 sm:py-0 sm:text-left sm:pl-0 sm:pr-5 md:pr-7"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.12, duration: 0.35 }}
                >
                  <Smile className="h-3.5 w-3.5 shrink-0 text-teal-200/90 sm:hidden" aria-hidden />
                  <p className="text-[7px] font-medium uppercase leading-tight tracking-[0.12em] text-white/70 sm:text-[11px] sm:tracking-[0.25em]">
                    Happy shoppers
                  </p>
                  <p className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-base font-semibold tabular-nums text-transparent sm:mt-1 sm:text-2xl">
                    45,000+
                  </p>
                </motion.div>
                <motion.div
                  className="flex min-w-0 flex-col items-center gap-[0.2875rem] px-1 py-0 text-center sm:flex-col sm:items-start sm:justify-center sm:gap-[0.2875rem] sm:px-4 sm:py-0 sm:text-left sm:pr-5 md:pr-7"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.18, duration: 0.35 }}
                >
                  <StoreIcon className="h-3.5 w-3.5 shrink-0 text-teal-200/90 sm:hidden" aria-hidden />
                  <p className="text-[7px] font-medium uppercase leading-tight tracking-[0.12em] text-white/70 sm:text-[11px] sm:tracking-[0.25em]">
                    Partner stores
                  </p>
                  <p className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-base font-semibold tabular-nums text-transparent sm:mt-1 sm:text-2xl">
                    18,500+
                  </p>
                </motion.div>
                <motion.div
                  className="flex min-w-0 flex-col items-center gap-[0.2875rem] px-1 py-0 text-center sm:flex-col sm:items-start sm:justify-center sm:gap-[0.2875rem] sm:px-4 sm:py-0 sm:text-left sm:pr-0 sm:pl-5 md:pl-7"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.24, duration: 0.35 }}
                >
                  <Star className="h-3.5 w-3.5 shrink-0 text-teal-200/90 sm:hidden" aria-hidden />
                  <p className="text-[7px] font-medium uppercase leading-tight tracking-[0.12em] text-white/70 sm:text-[11px] sm:tracking-[0.25em]">
                    Avg. satisfaction
                  </p>
                  <p className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-base font-semibold tabular-nums text-transparent sm:mt-1 sm:text-2xl">
                    4.8/5
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-amber-100/80 bg-gradient-to-b from-amber-50/50 to-white px-4 pb-0 pt-8 sm:pt-12">
        <div className="mx-auto max-w-7xl">
          <StoreBrowseFilters
            categories={storeCategoryOptions}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
          {orderedFollowedStores.length > 0 ? (
            <div className="mt-8 sm:mt-10">
              <SectionHeader
                title="Following"
                compactOnMobile
                subtitle="Stores you follow — quick access from your home feed"
              />
              {filteredFollowedStores.length > 0 ? (
                renderResponsiveStoreGrid(followingStoresVisible, false, {
                  mobileMaxItems: followingExpanded ? null : undefined,
                })
              ) : searchQuery.trim() ? (
                <p className="py-6 text-center text-sm text-slate-600">
                  No followed stores match your search.
                </p>
              ) : null}
              {filteredFollowedStores.length > FOLLOWING_SECTION_PREVIEW_COUNT ? (
                <div className="mt-6 flex justify-center sm:mt-8">
                  <button
                    type="button"
                    onClick={() => setFollowingExpanded((prev) => !prev)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {followingExpanded
                      ? 'Show fewer stores'
                      : `All following stores (${filteredFollowedStores.length})`}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="px-4 pb-0 pt-[5%] sm:py-12">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title={locationDetecting ? 'Detecting your area…' : 'Near You'}
            compactOnMobile
            subtitle={
              location
                ? `Stores close to ${location.label}`
                : 'Set your location to find nearby shops'
            }
          />
          {nearbyLoading && <p className="text-center text-gray-500 py-8">Loading stores near you…</p>}
          {nearbyError && <p className="text-center text-red-500 py-8">{nearbyError}</p>}
          {!nearbyLoading && !nearbyError && orderedNearbyStores.length === 0 && location && (
            <p className="text-center text-gray-500 py-8">
              No stores found within 50 km. Try expanding your search radius using the location control at the top.
            </p>
          )}
          {!nearbyLoading && !nearbyError && orderedNearbyStores.length === 0 && !location && (
            <p className="text-center text-gray-500 py-8">Use the location selector at the top to see stores near you.</p>
          )}
          {!nearbyLoading &&
            !nearbyError &&
            orderedNearbyStores.length > 0 &&
            filteredNearbyStores.length === 0 &&
            searchQuery.trim() && (
              <p className="py-8 text-center text-sm text-slate-600">
                No nearby stores match your search.
              </p>
            )}
          {!nearbyLoading && filteredNearbyStores.length > 0 && (
            renderResponsiveStoreGrid(filteredNearbyStores, true)
          )}
          {fallbackQueryUsed && (
            <p className="text-xs text-gray-400 text-center mt-4">Showing results for: {fallbackQueryUsed}</p>
          )}
        </div>
      </section>

      <section
        id="stores"
        className="border-t border-slate-200/80 bg-white px-4 pb-0 pt-[10px] sm:pb-12 sm:pt-[calc(3rem+10px)]"
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="All stores"
            compactOnMobile
            subtitle="Browse sellers across every category"
            action={
              <Link
                href="/all-stores"
                className="mb-[15px] inline-flex min-h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-10 sm:px-4 sm:py-2 sm:text-sm whitespace-normal text-center leading-tight"
              >
                All stores
              </Link>
            }
          />
          <StoreExplorer
            stores={filteredStoresByCategory}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
            categorySourceStores={orderedStores}
          />
        </div>
      </section>

      <section className="bg-white px-4 pb-0 pt-[10px] sm:pb-12 sm:pt-[calc(3rem+10px)]">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="Verified Sellers"
            compactOnMobile
            titleClassName="whitespace-nowrap text-[clamp(1.05rem,4vw,1.3rem)] sm:text-[1.15rem] md:text-[1.3rem] lg:text-[1.35rem]"
            subtitle="Stores with an active paid subscription on Larawans"
            action={
              <Link
                href="/all-stores"
                className="inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
              >
                All stores
              </Link>
            }
          />
          {paidPlanSellers.length > 0 ? (
            filteredPaidPlanSellers.length > 0 ? (
              renderResponsiveStoreGrid(filteredPaidPlanSellers, true, { forceVerifiedBadge: true })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
                No verified sellers match your search.
              </p>
            )
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600">
              Subscribed sellers will appear here once stores upgrade from the free trial.
            </p>
          )}
        </div>
      </section>

      <section id="products" className="px-4 pb-5 pt-12 sm:pb-5 sm:pt-14">
        <div className="mx-auto max-w-7xl px-0 py-0 sm:px-0 sm:py-0">
          <SectionHeader
            title="Trending Products"
            compactOnMobile
            titleClassName="whitespace-nowrap text-[clamp(1.05rem,4vw,1.3rem)] sm:text-[1.15rem] md:text-[1.3rem] lg:text-[1.35rem]"
            subtitle="Popular products and services from our marketplace"
            action={
              <Link
                href="/products"
                className="inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:h-10 sm:px-4 sm:text-sm"
              >
                All products
              </Link>
            }
          />
          <TrendingProductsRail products={filteredTrendingProducts} />
        </div>
      </section>

      {orderedStores.length > 0 ? (
        <nav aria-label="All store links" className="sr-only">
          <ul>
            {orderedStores.slice(0, 300).map((store) => (
              <li key={`seo-link-${store.id}`}>
                <Link href={`/store/${encodeURIComponent(store.username)}`}>{store.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
