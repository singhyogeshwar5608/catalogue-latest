import 'server-only';

import {
  fetchStoresFromLaravel,
  fetchStoreByUsernameFromLaravel,
  getServerLaravelApiBase,
} from '@/lib/server/laravel-stores';
import { prefetchFreeTrialDays } from '@/src/lib/freeTrialDays';
import { ensureStoreTrialEndsAt } from '@/src/lib/freeTrialDays';
import type { Product, Service, Store, Review, ReviewPagination, RatingSummary } from '@/types';
import type { BackendStore, BackendProduct, BackendService, BackendReview } from '@/types/api';
import type { ApiEnvelope } from '@/src/lib/api-shared';
import { normalizeProduct, normalizeBackendService, normalizeStore } from '@/src/lib/api-shared';

type LaravelProductPaginator = {
  current_page?: number;
  data?: BackendProduct[];
  last_page?: number;
  per_page?: number;
  total?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Public store list — same upstream as Redis-backed GET /api/stores. */
export async function serverListPublicStores(options?: {
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  only_verified?: boolean;
  only_boosted?: boolean;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  include_inactive?: boolean;
  /** Laravel: active non-free subscription (paid plan). */
  paid_subscription?: boolean;
}): Promise<Store[]> {
  const queryParams = new URLSearchParams();
  if (options?.search) queryParams.append('search', options.search);
  if (options?.category) queryParams.append('category', options.category);
  if (options?.location) queryParams.append('location', options.location);
  if (options?.only_verified) queryParams.append('only_verified', '1');
  if (options?.only_boosted) queryParams.append('only_boosted', '1');
  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (typeof options?.lat === 'number') queryParams.append('lat', options.lat.toString());
  if (typeof options?.lng === 'number') queryParams.append('lng', options.lng.toString());
  if (typeof options?.radiusKm === 'number') queryParams.append('radius_km', options.radiusKm.toString());
  if (options?.include_inactive) queryParams.append('include_inactive', '1');
  if (options?.paid_subscription) queryParams.append('paid_subscription', '1');
  return fetchStoresFromLaravel(queryParams.toString());
}

export type TrendingProductItem = Product & { storeUsername?: string };

/** Latest products across active stores (home rail). */
export async function serverFetchTrendingProducts(limit = 24): Promise<TrendingProductItem[]> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const url = `${base}/products/trending?limit=${encodeURIComponent(String(limit))}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  let envelope: ApiEnvelope<unknown>;
  try {
    envelope = (await res.json()) as ApiEnvelope<unknown>;
  } catch {
    return [];
  }
  const raw = envelope?.data;
  const rows: unknown[] = Array.isArray(raw) ? raw : [];
  const out: TrendingProductItem[] = [];
  for (const row of rows) {
    const r = row as BackendProduct & { store?: BackendStore };
    const st = r.store;
    if (!st || typeof st !== 'object') continue;
    try {
      const product = normalizeProduct(r, st);
      const un = String(st.slug ?? (st as { username?: string }).username ?? '').trim();
      out.push({ ...product, storeUsername: un || undefined });
    } catch {
      /* skip malformed row */
    }
  }
  return out;
}

export async function serverGetPublicStoreByUsername(username: string): Promise<Store | null> {
  return fetchStoreByUsernameFromLaravel(username.trim());
}

/** Full normalized store + raw Laravel row (for product/service normalization). */
export async function serverFetchStoreWithRaw(
  username: string
): Promise<{ store: Store; backend: BackendStore } | null> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const res = await fetch(`${base}/store/${encodeURIComponent(username.trim())}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const envelope = (await res.json()) as ApiEnvelope<BackendStore>;
  const raw = envelope?.data;
  if (!raw || typeof raw !== 'object') return null;
  const store = ensureStoreTrialEndsAt(normalizeStore(raw));
  return { store, backend: raw };
}

export async function serverGetProductsForStoreBackend(store: BackendStore): Promise<Product[]> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const storeId = String(store.id ?? '');
  const perPage = 100;
  let page = 1;
  let lastPage = 1;
  const productRows: BackendProduct[] = [];

  do {
    const url = `${base}/products/${encodeURIComponent(storeId)}?page=${page}&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });
    if (!res.ok) break;
    const envelope = (await res.json()) as ApiEnvelope<BackendProduct[] | LaravelProductPaginator>;
    const data = envelope.data as unknown;
    const pageRows = Array.isArray(data)
      ? data
      : data && typeof data === 'object' && Array.isArray((data as LaravelProductPaginator).data)
        ? ((data as LaravelProductPaginator).data as BackendProduct[])
        : [];
    productRows.push(...pageRows);
    if (data && typeof data === 'object' && typeof (data as LaravelProductPaginator).last_page === 'number') {
      lastPage = Math.max(1, Number((data as LaravelProductPaginator).last_page ?? 1));
      page += 1;
    } else {
      break;
    }
  } while (page <= lastPage);

  return productRows.map((p) => normalizeProduct(p, store));
}

export async function serverGetServicesForStoreBackend(store: BackendStore): Promise<Service[]> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const storeId = String(store.id ?? '');
  const res = await fetch(`${base}/services/${encodeURIComponent(storeId)}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });
  if (!res.ok) return [];
  const envelope = (await res.json()) as ApiEnvelope<BackendService[]>;
  const data = envelope.data as unknown;
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: BackendService[] }).items)
      ? (data as { items: BackendService[] }).items
      : [];
  return rows.map((s) => normalizeBackendService(s, store));
}

type BackendReviewListResponse = {
  summary?: {
    rating?: number;
    total_reviews?: number;
    rating_distribution?: Record<string, number | string>;
  };
  pagination?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
  reviews?: BackendReview[];
};

function toNum(v?: string | number | null, d = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
  }
  return d;
}

function normalizeReviewServer(review: BackendReview): Review {
  const ratingValue = Math.min(5, Math.max(0, toNum(review.rating)));
  const sellerReply = review.seller_reply?.message
    ? {
        message: review.seller_reply.message,
        date: review.seller_reply.date ?? review.reviewed_at ?? new Date().toISOString(),
      }
    : undefined;
  return {
    id: String(review.id),
    storeId: review.store_id ? String(review.store_id) : '',
    productId: review.product_id ? String(review.product_id) : undefined,
    userName: review.user_name || review.user?.name || 'Anonymous',
    userAvatar: review.user_avatar || (review.user?.avatar ? String(review.user.avatar) : undefined),
    rating: ratingValue,
    comment: review.comment ?? '',
    reviewedAt: review.reviewed_at ?? new Date().toISOString(),
    sellerReply,
    isApproved: review.is_approved !== false,
  };
}

export type ReviewListServerResult = {
  reviews: Review[];
  summary: RatingSummary;
  pagination: ReviewPagination;
};

export async function serverGetStoreReviews(
  storeId: string,
  page = 1,
  perPage = 5
): Promise<ReviewListServerResult | null> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const q = buildQuery({ page, per_page: perPage });
  const res = await fetch(`${base}/store/${encodeURIComponent(storeId)}/reviews${q}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const envelope = (await res.json()) as ApiEnvelope<BackendReviewListResponse>;
  const payload = envelope.data;
  if (!payload || typeof payload !== 'object') return null;
  const distRaw = payload.summary?.rating_distribution;
  let distribution: RatingSummary['distribution'] | undefined;
  if (distRaw && typeof distRaw === 'object') {
    const out: NonNullable<RatingSummary['distribution']> = {} as NonNullable<RatingSummary['distribution']>;
    for (let s = 1; s <= 5; s++) {
      const v = (distRaw as Record<string, unknown>)[String(s)];
      if (v == null) continue;
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) {
        out[s as 1 | 2 | 3 | 4 | 5] = Math.trunc(n);
      }
    }
    distribution = Object.keys(out).length > 0 ? out : undefined;
  }
  return {
    summary: {
      rating: Number(payload.summary?.rating ?? 0),
      totalReviews: Number(payload.summary?.total_reviews ?? 0),
      distribution,
    },
    pagination: {
      currentPage: payload.pagination?.current_page ?? 1,
      lastPage: payload.pagination?.last_page ?? 1,
      perPage: payload.pagination?.per_page ?? perPage,
      total: payload.pagination?.total ?? (payload.reviews?.length ?? 0),
      hasMore: Boolean(payload.pagination?.has_more),
    },
    reviews: Array.isArray(payload.reviews) ? payload.reviews.map(normalizeReviewServer) : [],
  };
}

export type ListingItem = Product & { storeUsername?: string; whatsapp?: string };

function storeToMinimalBackend(st: Store): BackendStore {
  const idNum = Number(st.id);
  const cat = st.category;
  return {
    id: Number.isFinite(idNum) ? idNum : 0,
    user_id: 0,
    name: st.name,
    slug: st.username,
    username: st.username,
    category: cat
      ? {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          business_type: cat.business_type,
        }
      : {
          id: 0,
          name: st.categoryName ?? 'General',
          business_type: 'product',
        },
    is_verified: st.isVerified,
    is_active: st.isActive !== false,
  };
}

/** Build product/service listing slice (matches client `/products` batch mapping). */
export async function serverBuildListingBatch(
  stores: Store[],
  startIndex: number,
  batchSize: number
): Promise<ListingItem[]> {
  const slice = stores.slice(startIndex, startIndex + batchSize);
  const rows = await Promise.all(
    slice.map(async (st) => {
      const backend = storeToMinimalBackend(st);
      const [storeProducts, storeServices] = await Promise.all([
        serverGetProductsForStoreBackend(backend).catch(() => [] as Product[]),
        serverGetServicesForStoreBackend(backend).catch(() => [] as Service[]),
      ]);
      const productsFromDb: ListingItem[] = storeProducts.map((product) => ({
        ...product,
        storeUsername: st.username,
        whatsapp: st.whatsapp,
      }));
      const servicesFromDb = storeServices.map(
        (service) =>
          ({
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
            storeUsername: st.username,
            whatsapp: st.whatsapp,
          }) as ListingItem
      );
      return [...productsFromDb, ...servicesFromDb];
    })
  );
  return rows.flat();
}
