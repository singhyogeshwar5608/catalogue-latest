'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SectionHeader from '@/components/SectionHeader';
import ProductCard from '@/components/ProductCard';
import ProductsPageToolbar, {
  type ProductsFilterKind,
  type ProductsSortKey,
} from '@/components/products/ProductsPageToolbar';
import { getAllStores, getProductsByStore, getServicesByStore } from '@/src/lib/api';
import { parseCoord } from '@/src/lib/geo';
import { perfLog } from '@/src/lib/perfLog';
import { useAuth } from '@/src/context/AuthContext';
import { useSearch } from '@/src/context/SearchContext';
import { prioritizeCurrentUserStore } from '@/src/lib/prioritize-user-store';
import { productListingMatchesSearch } from '@/src/lib/productListingSearchMatch';
import type { Product, Service, Store } from '@/types';

export type ListingItem = Product & {
  storeUsername?: string;
  whatsapp?: string;
  storeLocation?: string | null;
  storeState?: string | null;
  storeDistrict?: string | null;
};

const STORES_BATCH_SIZE = 8;

function dedupeStoresById(stores: Store[]): Store[] {
  const seen = new Set<string>();
  return stores.filter((s) => {
    const id = String(s.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function listingDedupeKey(item: ListingItem): string {
  const sid = item.storeId != null && item.storeId !== '' ? String(item.storeId) : '';
  const un = item.storeUsername?.trim() ?? '';
  return `${sid || un || 'store'}-${String(item.id)}`;
}

function isServiceListingItem(item: ListingItem): boolean {
  return String(item.id).startsWith('service-') || item.category === 'Service';
}

export default function ProductsPageClient({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [items, setItems] = useState<ListingItem[]>([]);
  const [filterKind, setFilterKind] = useState<ProductsFilterKind>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState<ProductsSortKey>('default');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialStores.length > 0);
  const [cursor, setCursor] = useState(0);
  const { user } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const searchParams = useSearchParams();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const orderedStoresRef = useRef<Store[]>([]);

  useLayoutEffect(() => {
    const prioritized = prioritizeCurrentUserStore(dedupeStoresById(initialStores), user);
    setStores(prioritized);
    orderedStoresRef.current = prioritized;
    setItems([]);
    setCursor(0);
    setHasMore(prioritized.length > 0);
    /** Show loader while we have stores to fetch products for, or while we may still client-fetch stores (SSR empty). */
    setIsInitialLoading(prioritized.length > 0 || initialStores.length === 0);
    setIsFetchingMore(false);
  }, [initialStores, user?.id]);

  useEffect(() => {
    const q = searchParams.get('q')?.trim() ?? '';
    if (!q) return;
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams, searchQuery, setSearchQuery]);

  useEffect(() => {
    if (initialStores.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const allStores = await getAllStores({ limit: 100 });
        if (cancelled) return;
        const prioritized = prioritizeCurrentUserStore(dedupeStoresById(allStores), user);
        setStores(prioritized);
        orderedStoresRef.current = prioritized;
        setItems([]);
        setCursor(0);
        setHasMore(prioritized.length > 0);
        if (prioritized.length === 0) {
          setIsInitialLoading(false);
        }
      } catch (e) {
        console.error('Products page: client store list failed', e);
        if (!cancelled) setIsInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialStores.length, user?.id]);

  useEffect(() => {
    perfLog('products', `client ready (${initialStores.length} stores from server)`);
  }, [initialStores.length]);

  const mapStoreItems = useCallback(async (store: Store): Promise<ListingItem[]> => {
    const [storeProducts, storeServices] = await Promise.all([
      getProductsByStore(store.id).catch(() => [] as Product[]),
      getServicesByStore(store.id).catch(() => [] as Service[]),
    ]);

    const productsFromDb = storeProducts.map((product) => ({
      ...product,
      storeUsername: store.username,
      whatsapp: store.whatsapp,
      storeLocation: store.location,
      storeState: store.state ?? null,
      storeDistrict: store.district ?? null,
      storeLatitude: product.storeLatitude ?? parseCoord(store.latitude),
      storeLongitude: product.storeLongitude ?? parseCoord(store.longitude),
    }));

    const servicesFromDb = storeServices.map((service) => ({
      id: `service-${service.id}`,
      storeId: service.storeId,
      storeName: service.storeName,
      name: service.title,
      description: service.description,
      price: service.price ?? 0,
      originalPrice: undefined,
      image: service.image,
      images: service.image ? [service.image] : [],
      category: 'Service',
      rating: 0,
      totalReviews: 0,
      inStock: service.isActive,
      storeUsername: store.username,
      whatsapp: store.whatsapp,
      storeLocation: store.location,
      storeState: store.state ?? null,
      storeDistrict: store.district ?? null,
      storeLatitude: service.storeLatitude ?? parseCoord(store.latitude),
      storeLongitude: service.storeLongitude ?? parseCoord(store.longitude),
    }));

    return [...productsFromDb, ...servicesFromDb];
  }, []);

  const loadNextBatch = useCallback(async () => {
    if (isFetchingMore) return;
    const orderedStores = orderedStoresRef.current;
    if (cursor >= orderedStores.length) {
      setHasMore(false);
      setIsInitialLoading(false);
      return;
    }

    setIsFetchingMore(true);
    try {
      const nextStores = orderedStores.slice(cursor, cursor + STORES_BATCH_SIZE);
      const listingRows = await Promise.all(nextStores.map((store) => mapStoreItems(store)));
      setItems((previous) => {
        const seen = new Set(previous.map((p) => listingDedupeKey(p)));
        const next: ListingItem[] = [...previous];
        for (const row of listingRows.flat()) {
          const k = listingDedupeKey(row);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(row);
        }
        return next;
      });
      const nextCursor = cursor + nextStores.length;
      setCursor(nextCursor);
      setHasMore(nextCursor < orderedStores.length);
    } finally {
      setIsFetchingMore(false);
      setIsInitialLoading(false);
    }
  }, [cursor, isFetchingMore, mapStoreItems]);

  useEffect(() => {
    if (stores.length === 0 || items.length > 0 || isFetchingMore) return;
    void loadNextBatch();
  }, [items.length, isFetchingMore, loadNextBatch, stores.length]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void loadNextBatch();
          }
        });
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [hasMore, loadNextBatch]);

  const filteredItems = useMemo(() => {
    let list = items;

    if (searchQuery.trim()) {
      list = list.filter((item) => productListingMatchesSearch(item, searchQuery));
    }

    if (filterKind === 'products') {
      list = list.filter((item) => !isServiceListingItem(item));
    } else if (filterKind === 'services') {
      list = list.filter((item) => isServiceListingItem(item));
    }

    if (inStockOnly) {
      list = list.filter((item) => item.inStock);
    }

    const next = [...list];
    if (sortKey === 'price-asc') {
      next.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (sortKey === 'price-desc') {
      next.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    } else if (sortKey === 'name-asc') {
      next.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
    }

    return next;
  }, [items, searchQuery, filterKind, inStockOnly, sortKey]);

  return (
    <main className="min-h-screen bg-white px-4 pt-3 pb-8 sm:px-6 sm:pt-10 sm:pb-12 lg:px-8 lg:pt-14 lg:pb-20">
      <div
        className="sm:hidden"
        style={{ height: 'var(--mobile-quick-search-height, 0px)' }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          compactOnMobile
          title="All Products"
          subtitle="Products and services from all stores"
          titleClassName="text-[21px] md:text-[27px]"
          subtitleClassName="text-[14px]"
          action={
            <Link
              href="/all-stores"
              className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
            >
              Browse Stores
            </Link>
          }
        />

        <ProductsPageToolbar
          filterKind={filterKind}
          inStockOnly={inStockOnly}
          onFilterKindChange={setFilterKind}
          onInStockOnlyChange={setInStockOnly}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
        />

        {isInitialLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            Loading products...
          </div>
        ) : filteredItems.length ? (
          <div className="grid grid-cols-2 items-stretch gap-2 min-w-0 sm:gap-3 md:grid-cols-3 md:gap-5 [&>*]:min-h-0 [&>*]:min-w-0">
            {filteredItems.map((item) => (
              <ProductCard
                key={listingDedupeKey(item)}
                product={item}
                href={item.storeUsername ? `/store/${item.storeUsername}` : undefined}
                openInModal={false}
                hideDescription
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm font-medium text-slate-500">
            {searchQuery.trim()
              ? 'No products or services match your search right now.'
              : stores.length === 0
                ? 'No stores are available to load products from. Check that the API is running and try again.'
                : 'No products or services are listed from stores yet.'}
          </div>
        )}

        {!isInitialLoading && hasMore ? (
          <div ref={sentinelRef} className="py-6 text-center text-sm text-slate-500">
            {isFetchingMore ? 'Loading more products...' : 'Scroll to load more'}
          </div>
        ) : null}
      </div>
    </main>
  );
}
