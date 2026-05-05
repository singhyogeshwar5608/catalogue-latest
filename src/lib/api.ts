'use client';

import type {
  BoostPlan,
  Product,
  ProductUnitType,
  Review,
  RatingSummary,
  ReviewListResponse,
  Service,
  ServiceBillingUnit,
  Store,
  StoreSubscriptionAddons,
  StorePaymentIntegrationSettings,
  StorePaymentIntegrationUpdateJson,
  StoreBoost,
  AdminDashboardStats,
  SubscriptionPlan,
  SubscriptionAddonCharges,
  SubscriptionBillingDiscounts,
  SubscriptionCheckoutPricing,
  StoreSubscription,
  ProductCheckoutPublic,
} from '@/types';
import { parseCoord, parseDistanceKm } from '@/src/lib/geo';
import type {
  BackendBoostPlan,
  BackendProduct,
  BackendProductCheckoutPayload,
  BackendService,
  BackendStore,
  BackendStoreBoost,
  BackendReview,
  StoreSummary,
  BackendSearchResponse,
} from '@/types/api';
import {
  purgeProductsCatalogCacheClient,
  purgeStoresCatalogCacheClient,
  purgeUsersCatalogCacheClient,
} from '@/src/lib/catalogCacheClient';
import { absolutizeStorageUrl } from '@/src/lib/api-shared';
import { formatStoreName } from '@/src/lib/format';
import {
  clearFreeTrialDaysClientCache,
  DEFAULT_FREE_TRIAL_DAYS,
  ensureStoreTrialEndsAt,
  prefetchFreeTrialDays,
  setFreeTrialDaysClientCache,
  trialEndsAtFallbackFromCreated,
} from '@/src/lib/freeTrialDays';
import { dispatchStoreProfileRefresh } from '@/src/lib/storeSubscriptionAddons';
import { getOrCreateStoreEngagementGuestToken } from '@/src/lib/storeEngagementGuest';

type ReviewListParams = {
  page?: number;
  perPage?: number;
};

type BackendReviewListResponse = {
  summary: {
    rating?: number;
    total_reviews?: number;
    rating_distribution?: Record<string, number> | Record<number, number>;
  };
  pagination: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    has_more?: boolean;
  };
  reviews: BackendReview[];
};

export type Category = {
  id: number;
  name: string;
  slug?: string;
  business_type: 'product' | 'service' | 'hybrid';
  is_active?: boolean;
  banner_image?: string | null;
  banner_images?: string[] | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
  color_combinations?: { color1: string; color2: string }[] | null;
  banner_pattern?: 'waves' | 'diagonal' | 'circles' | null;
};

export type HeroBannerSlideDto = {
  key: string;
  image: string;
  title: string;
  subtitle?: string | null;
};

export type CreateCategoryPayload = {
  name: string;
  slug: string;
  business_type: Category['business_type'];
  is_active: boolean;
  banner_image?: string | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
};

export type UpdateCategoryBannerPayload = {
  banner_image?: string | null;
  banner_images?: string[] | null;
  banner_color?: string | null;
  banner_title?: string | null;
  banner_subtitle?: string | null;
};

type ReviewSubmitPayload = {
  rating: number;
  comment: string;
};

export const addService = async (payload: AddServicePayload) => {
  const response = await apiRequest<BackendService>('/services', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return {
    service: normalizeService(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const updateProduct = async (payload: UpdateProductPayload) => {
  const { id, ...rest } = payload;
  const response = await apiRequest<BackendProduct>(`/product/${id}`, {
    method: 'PUT',
    body: rest,
    requiresAuth: true,
  });

  await purgeProductsCatalogCacheClient();

  return {
    product: normalizeProduct(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const deleteProduct = async (productId: number | string) => {
  await apiRequest(`/product/${productId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
  await purgeProductsCatalogCacheClient();
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'super_admin';
  storeSlug: string | null;
  stores: StoreSummary[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type CreateStorePayload = {
  name: string;
  category_id: number;
  logo?: string | null;
  address: string;
  phone: string;
  email: string;
  show_phone?: boolean;
  description?: string;
  location?: string;
  state?: string;
  district?: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

export type UpdateStorePayload = {
  id: number | string;
  name?: string;
  category_id?: number;
  logo?: string | null;
  address?: string;
  phone?: string | null;
  email?: string | null;
  show_phone?: boolean;
  description?: string;
  is_verified?: boolean;
  is_active?: boolean;
  is_lifetime?: boolean;
  location?: string;
  state?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

export type AddProductPayload = {
  /** Target store when the user owns more than one; avoids wrong-store plan limits. */
  store_id?: number | string;
  title: string;
  price: number;
  original_price?: number;
  category?: string;
  image?: string;
  description?: string;
  is_active?: boolean;
  unit_type?: string;
  unit_custom_label?: string | null;
  unit_quantity?: number | null;
  wholesale_enabled?: boolean;
  wholesale_price?: number | null;
  wholesale_min_qty?: number | null;
  min_order_quantity?: number | null;
  discount_enabled?: boolean;
  discount_price?: number | null;
  discount_schedule_enabled?: boolean;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
};

export type UpdateProductPayload = Partial<AddProductPayload> & {
  id: number | string;
};

export type AddServicePayload = {
  store_id: number | string;
  title: string;
  price?: number;
  description?: string;
  image?: string;
  is_active?: boolean;
  billing_unit?: string;
  custom_billing_unit?: string | null;
  min_quantity?: number | null;
  package_price?: number | null;
};

export type SearchAllParams = {
  query: string;
  location?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  types?: Array<'stores' | 'products' | 'services'>;
  limits?: {
    stores?: number;
    products?: number;
    services?: number;
  };
};

/** Live Laravel API (see `backend/bootstrap/app.php` — routes use prefix `api/v1/v1`). */
const LIVE_API_BASE = `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

/** Ensures a single `.../api/v1/v1` suffix (avoids POST to `/api/v1/store` or `/api/v1/v1/v1/store` by mistake). */
function normalizeNextPublicApiBaseUrl(raw: string): string {
  let u = raw.replace(/\/+$/, '');
  if (/\/api\/v1\/v1$/i.test(u)) return u;
  if (/\/api\/v1$/i.test(u)) return `${u}/v1`;
  if (/\/v1\/v1$/i.test(u) && !/\/api\//i.test(u)) {
    // Origin without /api/ — caller gave host + /v1/v1; assume they meant /api/v1/v1
    if (/^https?:\/\/[^/]+/i.test(u)) {
      u = u.replace(/\/v1\/v1$/i, '') + '/api/v1/v1';
      return u;
    }
  }
  if (!/\/api\//i.test(u)) u = `${u}/api/v1/v1`;
  return u;
}

const resolvedPublicApiBase = (() => {
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (v && v.length > 0) return normalizeNextPublicApiBaseUrl(v);
  // Never default dev to localhost — env often fails to inline; users expect live data.
  return LIVE_API_BASE;
})();

export const API_BASE_URL = resolvedPublicApiBase;

/**
 * In development, default to same-origin `/api/laravel` (see `next.config.ts` rewrites) so the
 * browser does not call the live API directly — avoids CORS preflight failures (e.g. OPTIONS 500
 * from some CDNs) and "Failed to fetch". Set `NEXT_PUBLIC_USE_API_PROXY=0` to force direct API URL.
 */
function shouldUseDevLaravelProxy(): boolean {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return false;
  if (process.env.NEXT_PUBLIC_USE_API_PROXY === "0") return false;
  if (process.env.NEXT_PUBLIC_USE_API_PROXY === "1") return true;
  const h = window.location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/**
 * Base URL for fetch(). Default: direct hit to {@link resolvedPublicApiBase} (live or whatever
 * `NEXT_PUBLIC_API_BASE_URL` is). In local dev, defaults to same-origin proxy unless opted out.
 */
export function getApiRequestBaseUrl(): string {
  if (shouldUseDevLaravelProxy()) {
    return `${window.location.origin}/api/laravel`;
  }
  return resolvedPublicApiBase;
}

if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    void prefetchFreeTrialDays(getApiRequestBaseUrl());
  });
}

/** Browser redirect to Laravel Socialite. */
export function getGoogleOAuthApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    LIVE_API_BASE;
  return raw.replace(/\/+$/, '');
}

const AUTH_TOKEN_HEADER = 'Authorization';
export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, status?: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/**
 * Reads Laravel-style validation from our JSON envelope (`data`) or plain Laravel (`errors`).
 */
export function parseApiValidationErrors(payload: unknown): Record<string, string[]> | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const raw = p.data ?? p.errors;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const out: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      const strs = val.filter((x): x is string => typeof x === 'string');
      if (strs.length) out[key] = strs;
    } else if (typeof val === 'string') {
      out[key] = [val];
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      const strs = Object.values(val as Record<string, unknown>).filter((x): x is string => typeof x === 'string');
      if (strs.length) out[key] = strs;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

const VALIDATION_LABELS_STORE: Record<string, string> = {
  name: 'Store name',
  category_id: 'Category',
  phone: 'Phone',
  email: 'Business email',
  address: 'Address',
  description: 'Description',
  logo: 'Logo',
  location: 'Location / area',
  slug: 'Store link',
  facebook_url: 'Facebook URL',
  instagram_url: 'Instagram URL',
  youtube_url: 'YouTube URL',
  linkedin_url: 'LinkedIn URL',
  show_phone: 'Phone visibility',
  password: 'Password',
};

const VALIDATION_LABELS_AUTH: Record<string, string> = {
  ...VALIDATION_LABELS_STORE,
  name: 'Full name',
  email: 'Email',
  password: 'Password',
  current_password: 'Current password',
  password_confirmation: 'Confirm password',
};

/** One readable banner string from validation map (e.g. "Email: must be valid."). */
export function formatValidationErrorsForDisplay(
  errors: Record<string, string[]>,
  context: 'store' | 'auth' = 'store',
): string {
  const map = context === 'auth' ? VALIDATION_LABELS_AUTH : VALIDATION_LABELS_STORE;
  const label = (field: string) => map[field] ?? field.replace(/_/g, ' ');

  return Object.entries(errors)
    .flatMap(([field, msgs]) => msgs.map((m) => `${label(field)}: ${m}`))
    .join('\n');
}

const isBrowser = () => typeof window !== 'undefined';

let authToken: string | null = null;

const ensureAuthToken = () => {
  if (!authToken && isBrowser()) {
    authToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  }
};

const persistAuthToken = (token: string | null) => {
  if (!isBrowser()) return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

const persistAuthUser = (user: ApiUser | null) => {
  if (!isBrowser()) return;
  if (user) {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(AUTH_USER_KEY);
  }
};

export const getStoredUser = (): ApiUser | null => {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
  persistAuthToken(token);
};

export const clearAuthToken = () => {
  setAuthToken(null);
};

export const getAuthHeaders = () => {
  ensureAuthToken();
  if (!authToken) return {};
  return { [AUTH_TOKEN_HEADER]: `Bearer ${authToken}` } as Record<string, string>;
};

export const apiRequest = async <T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: Record<string, unknown> | FormData | undefined;
    requiresAuth?: boolean;
    /** When true, sends Bearer token if present (does not throw if missing). */
    sendAuthIfAvailable?: boolean;
  } = {}
): Promise<ApiEnvelope<T>> => {
  const { method = 'GET', body, requiresAuth = false, sendAuthIfAvailable = false } = options;
  const url = `${getApiRequestBaseUrl()}${path}`;

  ensureAuthToken();

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (requiresAuth) {
    if (!authToken) {
      throw new ApiError('Unauthorized', 401);
    }
    headers[AUTH_TOKEN_HEADER] = `Bearer ${authToken}`;
  } else if (sendAuthIfAvailable) {
    ensureAuthToken();
    if (authToken) {
      headers[AUTH_TOKEN_HEADER] = `Bearer ${authToken}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type');
  const responseData = contentType?.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(responseData?.message ?? 'Request failed', response.status, responseData);
  }

  if (
    responseData !== null &&
    typeof responseData === 'object' &&
    'success' in responseData &&
    (responseData as ApiEnvelope<unknown>).success === false
  ) {
    const msg =
      typeof (responseData as ApiEnvelope<unknown>).message === 'string'
        ? (responseData as ApiEnvelope<unknown>).message
        : 'Request failed';
    throw new ApiError(msg, response.status, responseData);
  }

  return responseData as ApiEnvelope<T>;
};

const normalizeUser = (user: any): ApiUser => {
  const stores: StoreSummary[] = Array.isArray(user?.stores)
    ? user.stores
        .map((store: any) => ({
          id: String(store?.id ?? ''),
          name: store?.name ?? 'My Store',
          // Laravel public path is `username`; prefer it so dashboard fetches match `GET /store/:username`.
          slug: String(store?.username ?? store?.slug ?? '').trim(),
        }))
        .filter((store: StoreSummary) => Boolean(store.id && store.slug))
    : [];

  const fallbackStoreSlug =
    user?.storeSlug ??
    user?.store_slug ??
    user?.store?.username ??
    user?.store?.slug ??
    stores[0]?.slug ??
    null;

  return {
    id: String(user?.id ?? ''),
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: (user?.role as 'user' | 'super_admin') ?? 'user',
    storeSlug: fallbackStoreSlug,
    stores,
  };
};

const fallbackLogo = 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop';
const fallbackBanner = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&h=400&fit=crop';
const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';

const PRODUCT_UNIT_TYPE_VALUES: readonly ProductUnitType[] = [
  'piece',
  'box',
  'pack',
  'set',
  'kilogram',
  'gram',
  'liter',
  'milliliter',
  'meter',
  'centimeter',
  'square_meter',
  'custom',
] as const;

const SERVICE_BILLING_UNIT_VALUES: readonly ServiceBillingUnit[] = [
  'session',
  'hour',
  'day',
  'week',
  'month',
  'project',
  'custom',
] as const;

const isValidProductUnitType = (value: unknown): value is ProductUnitType =>
  typeof value === 'string' && (PRODUCT_UNIT_TYPE_VALUES as readonly string[]).includes(value);

const isValidServiceBillingUnit = (value: unknown): value is ServiceBillingUnit =>
  typeof value === 'string' && (SERVICE_BILLING_UNIT_VALUES as readonly string[]).includes(value);

const toNumber = (value?: string | number | null, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

const normalizeBoostPlan = (plan: BackendBoostPlan): BoostPlan => ({
  id: String(plan.id),
  name: plan.name,
  days: Number(plan.days ?? 0),
  price: Number(plan.price ?? 0),
  priorityWeight: Number(plan.priority_weight ?? 1),
  badgeLabel: plan.badge_label ?? 'Boost Pro',
  badgeColor: plan.badge_color ?? '#fde68a',
  isActive: plan.is_active !== false,
  features: Array.isArray(plan.features) ? plan.features : undefined,
});

const normalizeStoreBoost = (
  boost: BackendStoreBoost,
  options: { includeStore?: boolean } = {}
): StoreBoost => {
  const includeStore = options.includeStore ?? false;
  const normalizedStore = includeStore && boost.store ? normalizeStore(boost.store, { includeActiveBoost: false }) : undefined;

  return {
    id: String(boost.id),
    storeId: String(boost.store_id),
    startsAt: boost.starts_at,
    endsAt: boost.ends_at,
    status: boost.status,
    activatedBy: boost.activated_by ? String(boost.activated_by) : undefined,
    plan: normalizeBoostPlan(boost.plan),
    ...(normalizedStore ? { store: normalizedStore } : {}),
  };
};

function resolveTrialEndsAt(store: BackendStore): string | null {
  const loose = store as BackendStore & {
    trialEndsAt?: string | null;
    createdAt?: string | null;
  };
  const direct = store.trial_ends_at ?? loose.trialEndsAt ?? null;
  if (direct) return direct;
  const createdRaw = store.created_at ?? loose.createdAt ?? null;
  if (!createdRaw) return null;
  return trialEndsAtFallbackFromCreated(String(createdRaw));
}

/** Read social URLs from snake_case, camelCase, or trimmed empty strings (Laravel / proxies vary). */
function backendStoreSocialLinks(store: BackendStore): NonNullable<Store['socialLinks']> {
  const r = store as BackendStore & Record<string, unknown>;
  const pick = (snake: keyof BackendStore, camel: string): string | null => {
    const a = r[snake as string];
    if (typeof a === 'string' && a.trim() !== '') return a.trim();
    const b = r[camel];
    if (typeof b === 'string' && b.trim() !== '') return b.trim();
    return null;
  };
  return {
    facebook: pick('facebook_url', 'facebookUrl'),
    instagram: pick('instagram_url', 'instagramUrl'),
    youtube: pick('youtube_url', 'youtubeUrl'),
    linkedin: pick('linkedin_url', 'linkedinUrl'),
  };
}

/** If PUT echoed a row without social columns, keep what we just sent (only for keys present on `payload`). */
function mergeUpdateStoreSocialFromPayload(store: Store, payload: UpdateStorePayload): Store {
  if (
    !('facebook_url' in payload) &&
    !('instagram_url' in payload) &&
    !('youtube_url' in payload) &&
    !('linkedin_url' in payload)
  ) {
    return store;
  }
  const cur = store.socialLinks ?? {};
  const pick = (key: keyof NonNullable<Store['socialLinks']>, field: keyof UpdateStorePayload) => {
    if (!(field in payload)) return cur[key] ?? null;
    const sent = payload[field];
    if (sent === null) return null;
    if (typeof sent === 'string' && sent.trim() !== '') return sent.trim();
    const fromApi = cur[key];
    if (typeof fromApi === 'string' && fromApi.trim() !== '') return fromApi.trim();
    return null;
  };
  return {
    ...store,
    socialLinks: {
      facebook: pick('facebook', 'facebook_url'),
      instagram: pick('instagram', 'instagram_url'),
      youtube: pick('youtube', 'youtube_url'),
      linkedin: pick('linkedin', 'linkedin_url'),
    },
  };
}

const normalizeStore = (
  store: BackendStore,
  options: { includeActiveBoost?: boolean } = {}
): Store => {
  const includeActiveBoost = options.includeActiveBoost ?? true;
  const description = store.description ?? '';
  const businessType = store.business_type ?? store.category?.business_type ?? 'product';
  const categoryName = store.category?.name ?? undefined;
  const shortDescription = store.short_description ?? (description.slice(0, 120) || businessType);
  const ratingRaw = toNumber(store.rating);
  const rating = ratingRaw > 0 ? Number(ratingRaw.toFixed(1)) : 0;
  const totalReviews = Math.max(0, Math.trunc(toNumber(store.total_reviews)));
  const layout = store.layout_type === 'layout2' ? 'layout2' : 'layout1';
  const storeBannerImageRaw = typeof store.banner === 'string' && store.banner.trim() ? store.banner.trim() : null;
  const categoryBannerImage = store.category?.banner_image ?? null;
  const categoryBannerColor = store.category?.banner_color ?? null;
  const resolvedBanner = storeBannerImageRaw ?? categoryBannerImage ?? fallbackBanner;
  const storeBannerImage = storeBannerImageRaw ? absolutizeStorageUrl(storeBannerImageRaw) : null;
  const banner = absolutizeStorageUrl(
    typeof resolvedBanner === 'string' && resolvedBanner.trim() ? resolvedBanner.trim() : String(fallbackBanner),
  );
  const activeBoost = includeActiveBoost && store.active_boost
    ? normalizeStoreBoost(store.active_boost, { includeStore: false })
    : null;

  const activeSubscription = (store as any).active_subscription ?? (store as any).activeSubscription ?? null;
  const normalizedSubscription = activeSubscription?.plan
    ? {
        id: String(activeSubscription.id),
        storeId: String(activeSubscription.store_id ?? store.id),
        subscriptionPlanId: String(activeSubscription.subscription_plan_id),
        price: Number(activeSubscription.price ?? 0),
        status: activeSubscription.status ?? 'active',
        startsAt: activeSubscription.starts_at,
        endsAt: activeSubscription.ends_at,
        autoRenew: Boolean(activeSubscription.auto_renew ?? true),
        activatedBy: activeSubscription.activated_by,
        plan: {
          id: String(activeSubscription.plan.id),
          name: activeSubscription.plan.name,
          slug: activeSubscription.plan.slug,
          price: Number(activeSubscription.plan.price ?? 0),
          billingCycle: activeSubscription.plan.billing_cycle ?? 'monthly',
          durationDays: activeSubscription.plan.duration_days ? Number(activeSubscription.plan.duration_days) : undefined,
          maxProducts: Number(activeSubscription.plan.max_products ?? 0),
          isPopular: Boolean(activeSubscription.plan.is_popular),
          isActive: Boolean(activeSubscription.plan.is_active),
          features: Array.isArray(activeSubscription.plan.features) ? activeSubscription.plan.features : [],
          description: activeSubscription.plan.description ?? '',
        },
      }
    : null;

  let subscriptionAddons: Store['subscriptionAddons'];
  const rawAddons = (store as BackendStore).subscription_addons;
  if (rawAddons != null && typeof rawAddons === 'object' && !Array.isArray(rawAddons)) {
    subscriptionAddons = {
      paymentGateway: Boolean(rawAddons.payment_gateway),
      qrCode: Boolean(rawAddons.qr_code),
      paymentGatewayHelp: Boolean(rawAddons.payment_gateway_help),
    };
  }

  const normalizedCategory = store.category
    ? {
        id: store.category.id,
        name: store.category.name,
        slug: store.category.slug,
        business_type: store.category.business_type,
        banner_image:
          typeof store.category.banner_image === 'string' && store.category.banner_image.trim()
            ? absolutizeStorageUrl(store.category.banner_image.trim())
            : null,
        banner_images: Array.isArray(store.category.banner_images)
          ? store.category.banner_images
              .filter((url): url is string => Boolean(url && typeof url === 'string'))
              .map((url) => absolutizeStorageUrl(url.trim()))
          : store.category.banner_images ?? null,
        banner_title: store.category.banner_title ?? null,
        banner_subtitle: store.category.banner_subtitle ?? null,
        banner_color: store.category.banner_color ?? null,
        color_combinations: store.category.color_combinations ?? null,
        banner_pattern: store.category.banner_pattern ?? null,
      }
    : undefined;

  const publicStorePath = String(
    store.slug ?? (store as BackendStore & { username?: string }).username ?? ''
  ).trim();

  const logoRaw = store.logo;
  const logoTrimmed =
    typeof logoRaw === 'string' && logoRaw.trim() !== '' ? logoRaw.trim() : null;
  const resolvedLogo = logoTrimmed ? absolutizeStorageUrl(logoTrimmed) : null;

  const categoryBannerImageResolved =
    typeof categoryBannerImage === 'string' && categoryBannerImage.trim()
      ? absolutizeStorageUrl(categoryBannerImage.trim())
      : null;

  return {
    id: String(store.id),
    userId: store.user_id != null ? String(store.user_id) : undefined,
    username: publicStorePath,
    name: formatStoreName(store.name),
    logo: resolvedLogo ?? fallbackLogo,
    banner,
    storeBannerImage,
    categoryBannerImage: categoryBannerImageResolved,
    categoryBannerColor,
    description,
    shortDescription,
    rating,
    totalReviews,
    isVerified: Boolean(store.is_verified),
    isBoosted: Boolean(store.is_boosted ?? activeBoost !== null),
    isActive: Boolean(store.is_active),
    boostExpiryDate: store.boost_expiry_date ?? activeBoost?.endsAt,
    businessType,
    categoryName,
    categoryId: store.category_id ? String(store.category_id) : undefined,
    themeId: store.theme ?? undefined,
    location: store.location ?? store.address ?? 'Pan India',
    latitude: parseCoord(store.latitude),
    longitude: parseCoord(store.longitude),
    distanceKm: parseDistanceKm(store.distance_km),
    phone: store.phone ?? undefined,
    email: store.email?.trim() ? store.email.trim() : undefined,
    showPhone: store.show_phone !== false,
    whatsapp: (store.whatsapp ?? store.phone ?? '').trim() || '',
    socialLinks: backendStoreSocialLinks(store),
    layoutType: layout,
    createdAt:
      store.created_at ??
      (store as BackendStore & { createdAt?: string | null }).createdAt ??
      new Date().toISOString(),
    trialEndsAt: resolveTrialEndsAt(store),
    isLifetime: Boolean((store as BackendStore & { is_lifetime?: unknown }).is_lifetime),
    activeBoost,
    activeSubscription: normalizedSubscription,
    subscriptionAddons,
    productsCount: (store as any).products_count ?? (store.products ? store.products.length : undefined),
    servicesCount: (store as any).services_count ?? undefined,
    user: store.user
      ? {
          id: String(store.user.id),
          name: store.user.name ?? 'Unknown',
          email: store.user.email ?? '',
        }
      : undefined,
    category: normalizedCategory,
    products: store.products
      ? store.products.map((product) => normalizeProduct(product, store))
      : undefined,
    services: store.services
      ? store.services.map((service) => normalizeService(service, store))
      : undefined,
    followersCount: Math.max(0, Math.trunc(toNumber((store as BackendStore).followers_count))),
    likesCount: Math.max(0, Math.trunc(toNumber((store as BackendStore).likes_count))),
    viewerFollowing: Boolean((store as BackendStore).viewer_following),
    viewerLiked: Boolean((store as BackendStore).viewer_liked),
    seenCount: Math.max(0, Math.trunc(toNumber((store as BackendStore).seen_count))),
  };
};

const normalizeProduct = (product: BackendProduct, store: BackendStore): Product => {
  const ratingValue = toNumber(product.rating);
  const totalReviews = Math.max(0, Math.trunc(toNumber(product.total_reviews)));
  const baseImages = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const images = baseImages.length
    ? baseImages
    : product.image
      ? [product.image]
      : [fallbackImage];

  const unitQuantityValue = product.unit_quantity != null ? Number(product.unit_quantity) : null;
  const wholesalePriceValue = product.wholesale_price != null ? Number(product.wholesale_price) : null;
  const wholesaleMinQtyValue = product.wholesale_min_qty != null ? Number(product.wholesale_min_qty) : null;

  let unitQuantity: number | null = null;
  if (unitQuantityValue != null && !Number.isNaN(unitQuantityValue) && unitQuantityValue > 0) {
    unitQuantity = unitQuantityValue;
  }

  let wholesalePrice: number | null = null;
  if (product.wholesale_enabled && wholesalePriceValue != null && !Number.isNaN(wholesalePriceValue)) {
    wholesalePrice = wholesalePriceValue;
  }

  let wholesaleMinQty: number | null = null;
  if (product.wholesale_enabled && wholesaleMinQtyValue != null && !Number.isNaN(wholesaleMinQtyValue)) {
    wholesaleMinQty = wholesaleMinQtyValue;
  }

  let minOrderQuantity: number | null = null;
  if (product.min_order_quantity != null) {
    const parsed = Number(product.min_order_quantity);
    if (!Number.isNaN(parsed) && parsed > 0) {
      minOrderQuantity = parsed;
    }
  }

  let discountPrice: number | null = null;
  if (product.discount_enabled && product.discount_price != null) {
    const parsed = Number(product.discount_price);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      discountPrice = parsed;
    }
  }

  const discountStartsAt = product.discount_schedule_enabled ? product.discount_starts_at ?? null : null;
  const discountEndsAt = product.discount_schedule_enabled ? product.discount_ends_at ?? null : null;

  return {
    id: String(product.id),
    storeId: String(product.store_id ?? store.id),
    storeName: formatStoreName(store.name),
    storeSlug: store.slug ?? (store as any).username ?? undefined,
    name: product.title ?? (product as BackendProduct & { name?: string }).name ?? 'Untitled product',
    description: product.description ?? '',
    price: Number(product.price ?? 0),
    originalPrice: product.original_price != null ? Number(product.original_price) : undefined,
    image: images[0] ?? fallbackImage,
    images,
    category: product.category ?? store.category?.name ?? 'General',
    rating: ratingValue > 0 ? Number(ratingValue.toFixed(1)) : 0,
    totalReviews,
    inStock: Boolean(product.is_active ?? (product as BackendProduct & { status?: boolean }).status),
    unitType: isValidProductUnitType(product.unit_type) ? (product.unit_type as ProductUnitType) : undefined,
    unitCustomLabel: product.unit_custom_label ?? null,
    unitQuantity,
    wholesaleEnabled: Boolean(product.wholesale_enabled),
    wholesalePrice,
    wholesaleMinQty,
    minOrderQuantity,
    discountEnabled: Boolean(product.discount_enabled),
    discountPrice,
    discountScheduleEnabled: Boolean(product.discount_schedule_enabled),
    discountStartsAt,
    discountEndsAt,
    storeLatitude: parseCoord(store.latitude),
    storeLongitude: parseCoord(store.longitude),
  };
};

const normalizeService = (service: BackendService, store: BackendStore): Service => {
  const minQuantityValue = service.min_quantity != null ? Number(service.min_quantity) : null;
  const packagePriceValue = service.package_price != null ? Number(service.package_price) : null;

  let minQuantity: number | null = null;
  if (minQuantityValue != null && !Number.isNaN(minQuantityValue) && minQuantityValue > 0) {
    minQuantity = minQuantityValue;
  }

  let packagePrice: number | null = null;
  if (service.package_price != null && !Number.isNaN(packagePriceValue)) {
    packagePrice = packagePriceValue;
  }

  return {
    id: String(service.id),
    storeId: String(service.store_id ?? store.id),
    storeName: formatStoreName(store.name),
    storeSlug: store.slug ?? (store as any).username ?? undefined,
    title: service.title,
    description: service.description ?? '',
    price: service.price != null ? Number(service.price) : null,
    image: service.image ?? fallbackImage,
    isActive: Boolean(service.is_active),
    billingUnit: isValidServiceBillingUnit(service.billing_unit) ? (service.billing_unit as ServiceBillingUnit) : undefined,
    customBillingUnit: service.custom_billing_unit ?? null,
    minQuantity,
    packagePrice,
    storeLatitude: parseCoord(store.latitude),
    storeLongitude: parseCoord(store.longitude),
  };
};

const normalizeReview = (review: BackendReview): Review => {
  const ratingValue = Math.min(5, Math.max(0, toNumber(review.rating)));
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
};

const parseRatingDistribution = (
  raw: BackendReviewListResponse['summary']['rating_distribution'] | undefined
): RatingSummary['distribution'] | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: NonNullable<RatingSummary['distribution']> = {};
  for (let s = 1; s <= 5; s++) {
    const v = (raw as Record<string, unknown>)[String(s)];
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) {
      out[s as 1 | 2 | 3 | 4 | 5] = Math.trunc(n);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const normalizeReviewListResponse = (payload: BackendReviewListResponse): ReviewListResponse => ({
  summary: {
    rating: Number(payload.summary?.rating ?? 0),
    totalReviews: Number(payload.summary?.total_reviews ?? 0),
    distribution: parseRatingDistribution(payload.summary?.rating_distribution),
  },
  pagination: {
    currentPage: payload.pagination?.current_page ?? 1,
    lastPage: payload.pagination?.last_page ?? 1,
    perPage: payload.pagination?.per_page ?? (payload.reviews?.length ?? 0),
    total: payload.pagination?.total ?? payload.reviews?.length ?? 0,
    hasMore: Boolean(payload.pagination?.has_more),
  },
  reviews: Array.isArray(payload.reviews) ? payload.reviews.map((review) => normalizeReview(review)) : [],
});

export const getCategories = async (options?: { auth?: boolean }): Promise<Category[]> => {
  const response = await apiRequest<Category[]>('/categories', {
    requiresAuth: options?.auth ?? false,
  });
  return response.data;
};

export const getHeroBannerSlides = async (): Promise<HeroBannerSlideDto[]> => {
  const response = await apiRequest<HeroBannerSlideDto[]>('/categories/hero-banners');
  const rows = Array.isArray(response.data) ? response.data : [];
  return rows
    .map((row) => ({
      key: typeof row?.key === 'string' && row.key.trim() ? row.key.trim() : `slide-${Math.random().toString(36).slice(2)}`,
      image: typeof row?.image === 'string' ? row.image.trim() : '',
      title: typeof row?.title === 'string' ? row.title.trim() : '',
      subtitle: typeof row?.subtitle === 'string' ? row.subtitle.trim() : undefined,
    }))
    .filter((row) => row.image !== '');
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<Category> => {
  const response = await apiRequest<Category>('/categories', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return response.data;
};

export const updateCategoryBanner = async (
  categoryId: number | string,
  payload: UpdateCategoryBannerPayload
): Promise<Category> => {
  const response = await apiRequest<Category>(`/categories/${categoryId}/banner`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return response.data;
};

export const deleteCategory = async (categoryId: number | string): Promise<void> => {
  await apiRequest(`/categories/${categoryId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const createStore = async (payload: CreateStorePayload) => {
  const response = await apiRequest<{ store: BackendStore; business_type: string }>("/store", {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  const normalizedStore = normalizeStore(response.data.store);

  const existingUser = getStoredUser();
  if (existingUser) {
    const newStoreSummary: StoreSummary = {
      id: normalizedStore.id,
      name: normalizedStore.name,
      slug: normalizedStore.username,
    };
    const nextStores = [...(existingUser.stores ?? []), newStoreSummary].filter(
      (store, index, self) => self.findIndex((candidate) => candidate.id === store.id) === index
    );

    const updatedUser: ApiUser = {
      ...existingUser,
      storeSlug: newStoreSummary.slug,
      stores: nextStores,
    };
    persistAuthUser(updatedUser);
  }

  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();

  return { store: normalizedStore, businessType: response.data.business_type };
};

export const getMyStores = async (): Promise<Store[]> => {
  const response = await apiRequest<BackendStore[]>('/my/stores', {
    method: 'GET',
    requiresAuth: true,
  });

  return response.data.map((store) => normalizeStore(store));
};

/** When login/me omits store slug, fetch owned stores so redirect can use `/store/{slug}`. */
const enrichUserWithMyStoresIfNeeded = async (user: ApiUser): Promise<ApiUser> => {
  if (user.storeSlug?.trim()) {
    return user;
  }
  try {
    const stores = await getMyStores();
    const primary = stores[0];
    const slug = primary?.username?.trim();
    if (!slug) {
      return user;
    }
    const nextStores: StoreSummary[] =
      user.stores && user.stores.length > 0
        ? user.stores
        : stores.map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.username,
          }));
    return {
      ...user,
      storeSlug: slug,
      stores: nextStores,
    };
  } catch {
    return user;
  }
};

export const loginUser = async (payload: LoginPayload) => {
  const response = await apiRequest<{ token: string; user: ApiUser }>(
    '/auth/login',
    {
      method: 'POST',
      body: payload,
    }
  );

  const normalizedUser = normalizeUser(response.data.user);
  setAuthToken(response.data.token);
  const enriched = await enrichUserWithMyStoresIfNeeded(normalizedUser);
  persistAuthUser(enriched);
  return { token: response.data.token, user: enriched };
};

export const registerUser = async (payload: RegisterPayload) => {
  const response = await apiRequest<{ token: string; user: ApiUser }>(
    '/auth/register',
    {
      method: 'POST',
      body: payload,
    }
  );

  const normalizedUser = normalizeUser(response.data.user);
  setAuthToken(response.data.token);
  const enriched = await enrichUserWithMyStoresIfNeeded(normalizedUser);
  persistAuthUser(enriched);
  await purgeUsersCatalogCacheClient();
  return { token: response.data.token, user: enriched };
};

export const fetchAuthenticatedUser = async (): Promise<ApiUser> => {
  const response = await apiRequest<ApiUser>('/auth/me', {
    requiresAuth: true,
  });

  const normalized = normalizeUser(response.data);
  return enrichUserWithMyStoresIfNeeded(normalized);
};

/** Payload from GET `/api/stores*` is already a client `Store` (camelCase); Laravel rows are snake_case `BackendStore`. */
function isNextCachedStorePayload(value: unknown): value is Store {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.username === 'string' && typeof o.layoutType === 'string';
}

/** Redis-cached rows skip normalizeStore; still rewrite storage URLs so /storage hits Next rewrites. */
function rewriteStoreMediaPaths(store: Store): Store {
  const nextCategory = store.category
    ? {
        ...store.category,
        banner_image: store.category.banner_image
          ? absolutizeStorageUrl(store.category.banner_image)
          : null,
        banner_images: Array.isArray(store.category.banner_images)
          ? store.category.banner_images.map((u) => absolutizeStorageUrl(typeof u === 'string' ? u : String(u)))
          : store.category.banner_images,
      }
    : store.category;

  return {
    ...store,
    logo: absolutizeStorageUrl(store.logo),
    banner: absolutizeStorageUrl(store.banner),
    storeBannerImage: store.storeBannerImage ? absolutizeStorageUrl(store.storeBannerImage) : null,
    categoryBannerImage: store.categoryBannerImage
      ? absolutizeStorageUrl(store.categoryBannerImage)
      : null,
    category: nextCategory,
  };
}

function adaptStoreListEntry(row: unknown): Store {
  if (isNextCachedStorePayload(row)) return rewriteStoreMediaPaths(row);
  return normalizeStore(row as BackendStore);
}

export const getStoreBySlug = async (slug: string): Promise<Store> => {
  return getStoreBySlugFromApi(slug.trim());
};

/**
 * Single-store payload directly from Laravel (`GET /store/:slug`), not from Next `/api/stores/*` Redis cache.
 * Use in dashboard shell after fields like `subscription_addons` change without a route navigation.
 */
export const getStoreBySlugFromApi = async (slug: string): Promise<Store> => {
  const key = slug.trim();
  const prefetchBase = typeof window !== 'undefined' ? getApiRequestBaseUrl() : API_BASE_URL;
  await prefetchFreeTrialDays(prefetchBase, { force: true });

  const base = getApiRequestBaseUrl().replace(/\/+$/, '');
  const guest = typeof window !== 'undefined' ? getOrCreateStoreEngagementGuestToken() : '';
  const qs = new URLSearchParams();
  if (guest) qs.set('guest_token', guest);
  qs.set('_ts', String(Date.now()));
  const headers: Record<string, string> = { Accept: 'application/json' };
  ensureAuthToken();
  if (authToken) {
    headers[AUTH_TOKEN_HEADER] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${base}/store/${encodeURIComponent(key)}?${qs.toString()}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (res.status === 404) {
    throw new ApiError('Store not found', 404);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(`Store request failed (${res.status}): ${text.slice(0, 120)}`, res.status);
  }

  const envelope = (await res.json()) as ApiEnvelope<BackendStore>;
  const raw = envelope?.data;
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('Invalid store response', 502);
  }

  return ensureStoreTrialEndsAt(normalizeStore(raw as BackendStore));
};

export type StoreEngagementTogglePayload = {
  followers_count: number;
  likes_count: number;
  viewer_following?: boolean;
  viewer_liked?: boolean;
};

export const toggleStoreFollow = async (storeId: string) => {
  const guest = getOrCreateStoreEngagementGuestToken();
  return apiRequest<StoreEngagementTogglePayload>(`/stores/${encodeURIComponent(storeId)}/follow`, {
    method: 'POST',
    body: guest ? { guest_token: guest } : {},
    sendAuthIfAvailable: true,
  });
};

export const toggleStoreLike = async (storeId: string) => {
  const guest = getOrCreateStoreEngagementGuestToken();
  return apiRequest<StoreEngagementTogglePayload>(`/stores/${encodeURIComponent(storeId)}/like`, {
    method: 'POST',
    body: guest ? { guest_token: guest } : {},
    sendAuthIfAvailable: true,
  });
};

export type StoreSeenRecordPayload = {
  seen_count: number;
  counted: boolean;
  your_hits: number;
  capped: boolean;
};

export type StoreOwnerNotification = {
  id: number;
  store_id: number;
  store_name?: string | null;
  type: 'follow' | 'like' | 'seen' | 'subscription' | string;
  title?: string | null;
  body?: string | null;
  meta?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type StoreOwnerNotificationsPayload = {
  notifications: StoreOwnerNotification[];
  unread_count: number;
};

/** Shoppers: notifications for followed stores (e.g. new product). */
export type UserFollowNotification = {
  id: number;
  type: string;
  title?: string | null;
  body?: string | null;
  meta?: { store_id?: number; product_id?: number; store_username?: string | null } | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type UserFollowNotificationsPayload = {
  notifications: UserFollowNotification[];
  unread_count: number;
};

/** Record a store page visit (max 10 counted contributions per visitor per store on the server). */
export const recordStoreView = async (storeId: string) => {
  const guest = getOrCreateStoreEngagementGuestToken();
  return apiRequest<StoreSeenRecordPayload>(`/stores/${encodeURIComponent(storeId)}/seen`, {
    method: 'POST',
    body: guest ? { guest_token: guest } : {},
    sendAuthIfAvailable: true,
  });
};

/**
 * Store-owner dashboard notifications.
 * NOTE: endpoint path follows backend notification controller route group.
 */
export const getMyStoreNotifications = async (params?: { limit?: number }) => {
  const qs = new URLSearchParams();
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await apiRequest<StoreOwnerNotificationsPayload>(`/my/store-notifications${suffix}`, {
    method: 'GET',
    requiresAuth: true,
  });
  return response.data;
};

export const markStoreNotificationRead = async (notificationId: number | string) => {
  const response = await apiRequest<{ id: number; read_at: string | null }>(
    `/my/store-notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      requiresAuth: true,
    }
  );
  return response.data;
};

export const deleteStoreNotification = async (notificationId: number | string) => {
  const response = await apiRequest<{ id: number }>(
    `/my/store-notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
  return response.data;
};

export const getMyFollowNotifications = async (params?: { limit?: number }) => {
  const qs = new URLSearchParams();
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const response = await apiRequest<UserFollowNotificationsPayload>(`/my/follow-notifications${suffix}`, {
    method: 'GET',
    requiresAuth: true,
  });
  return response.data;
};

export const markFollowNotificationRead = async (notificationId: number | string) => {
  const response = await apiRequest<{ id: number; read_at: string | null }>(
    `/my/follow-notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      requiresAuth: true,
    }
  );
  return response.data;
};

export const deleteFollowNotification = async (notificationId: number | string) => {
  const response = await apiRequest<{ id: number }>(
    `/my/follow-notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'DELETE',
      requiresAuth: true,
    }
  );
  return response.data;
};

export const searchAll = async (params: SearchAllParams) => {
  const { query, location, lat, lng, radiusKm, types, limits } = params;
  const queryParams = new URLSearchParams();
  queryParams.append('q', query);
  if (location) queryParams.append('location', location);
  if (typeof lat === 'number') queryParams.append('lat', lat.toString());
  if (typeof lng === 'number') queryParams.append('lng', lng.toString());
  if (typeof radiusKm === 'number') queryParams.append('radius_km', radiusKm.toString());
  if (Array.isArray(types) && types.length) queryParams.append('types', types.join(','));
  if (limits?.stores) queryParams.append('store_limit', limits.stores.toString());
  if (limits?.products) queryParams.append('product_limit', limits.products.toString());
  if (limits?.services) queryParams.append('service_limit', limits.services.toString());

  const response = await apiRequest<BackendSearchResponse>(`/search?${queryParams.toString()}`);
  const payload = response.data;

  const normalizedStores = Array.isArray(payload.results?.stores)
    ? payload.results.stores.map((store) => normalizeStore(store))
    : [];
  const normalizedProducts = Array.isArray(payload.results?.products)
    ? payload.results.products
        .filter((product) => product?.store)
        .map((product) => normalizeProduct(product, product.store as BackendStore))
    : [];
  const normalizedServices = Array.isArray(payload.results?.services)
    ? payload.results.services
        .filter((service) => service?.store)
        .map((service) => normalizeService(service, service.store as BackendStore))
    : [];

  return {
    query: payload.query,
    location: payload.location,
    lat: payload.lat,
    lng: payload.lng,
    radiusKm: payload.radius_km,
    types: Array.isArray(payload.types) && payload.types.length
      ? (payload.types as Array<'stores' | 'products' | 'services'>)
      : (['stores', 'products', 'services'] as Array<'stores' | 'products' | 'services'>),
    stores: normalizedStores,
    products: normalizedProducts,
    services: normalizedServices,
  } as const;
};

export const updateAccountPassword = async (payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) => {
  await apiRequest<unknown>('/auth/password', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });
};

export const updateStore = async (payload: UpdateStorePayload) => {
  const response = await apiRequest<{ store: BackendStore; business_type?: string }>(`/store/${payload.id}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  const inner = response.data?.store;
  if (!inner || typeof inner !== 'object') {
    throw new ApiError('Invalid store update response', 502);
  }

  let normalizedStore = normalizeStore(inner as BackendStore);
  normalizedStore = mergeUpdateStoreSocialFromPayload(normalizedStore, payload);

  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();

  return { store: normalizedStore };
};

export const deleteStore = async (storeId: number | string) => {
  await apiRequest(`/store/${storeId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();
};

export const addProduct = async (payload: AddProductPayload) => {
  const response = await apiRequest<BackendProduct>('/product', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  await purgeProductsCatalogCacheClient();

  // We don't have the store context in this response, so return minimal data.
  return {
    product: normalizeProduct(response.data, {
      id: Number(response.data.store_id ?? 0),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore),
  };
};

export const getAllStores = async (params?: {
  search?: string;
  category?: string;
  location?: string;
  only_verified?: boolean;
  only_boosted?: boolean;
  limit?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  include_inactive?: boolean;
  /** Active paid (non-free) subscription — Laravel `GET /stores?paid_subscription=1`. */
  paid_subscription?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.location) queryParams.append('location', params.location);
  if (params?.only_verified) queryParams.append('only_verified', '1');
  if (params?.only_boosted) queryParams.append('only_boosted', '1');
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (typeof params?.lat === 'number') queryParams.append('lat', params.lat.toString());
  if (typeof params?.lng === 'number') queryParams.append('lng', params.lng.toString());
  if (typeof params?.radiusKm === 'number') queryParams.append('radius_km', params.radiusKm.toString());
  if (params?.include_inactive) queryParams.append('include_inactive', '1');
  if (params?.paid_subscription) queryParams.append('paid_subscription', '1');

  const qs = queryParams.toString();

  /** Hit Laravel like `/categories`, not Next `/api/stores` — Redis there has no TTL and can show stale rows from another DB. */
  const path = qs ? `/stores?${qs}` : '/stores';
  try {
    const response = await apiRequest<BackendStore[]>(path, { sendAuthIfAvailable: true });

    const raw = response.data as unknown;
    const rows: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)
        ? ((raw as { data: unknown[] }).data)
        : [];

    return rows.map(adaptStoreListEntry);
  } catch (e) {
    console.error('[getAllStores] Laravel /stores failed — check NEXT_PUBLIC_API_BASE_URL and CORS', e);
    return [];
  }
};

export type TrendingProductRailItem = Product & { storeUsername?: string };

/** Latest active products across stores (home trending rail). */
export const getTrendingProducts = async (limit = 24): Promise<TrendingProductRailItem[]> => {
  try {
    const response = await apiRequest<unknown>(`/products/trending?limit=${limit}`, {
      sendAuthIfAvailable: true,
    });
    const raw = response.data as unknown;
    const rows: unknown[] = Array.isArray(raw) ? raw : [];
    const out: TrendingProductRailItem[] = [];
    for (const row of rows) {
      const r = row as BackendProduct & { store?: BackendStore };
      const st = r.store;
      if (!st || typeof st !== 'object') continue;
      const product = normalizeProduct(r, st);
      const un = String(st.slug ?? (st as { username?: string }).username ?? '').trim();
      out.push({ ...product, storeUsername: un || undefined });
    }
    return out;
  } catch (e) {
    console.warn('[getTrendingProducts]', e);
    return [];
  }
};

/** Stores the current viewer follows (logged-in or guest_token). Not cached. */
export const getFollowedStores = async (): Promise<Store[]> => {
  if (typeof window === 'undefined') return [];
  try {
    const base = getApiRequestBaseUrl().replace(/\/+$/, '');
    const qs = new URLSearchParams();
    const guest = getOrCreateStoreEngagementGuestToken();
    if (guest) qs.set('guest_token', guest);
    ensureAuthToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) {
      headers[AUTH_TOKEN_HEADER] = `Bearer ${authToken}`;
    }
    const res = await fetch(`${base}/stores/following?${qs.toString()}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      return [];
    }
    const envelope = (await res.json()) as ApiEnvelope<unknown>;
    const raw = envelope?.data as unknown;
    const rows: unknown[] = Array.isArray(raw) ? raw : [];
    return rows.map(adaptStoreListEntry);
  } catch {
    return [];
  }
};

export const getBoostPlans = async (): Promise<BoostPlan[]> => {
  const response = await apiRequest<BackendBoostPlan[]>('/boost-plans', {
    requiresAuth: true,
  });

  return response.data.map((plan) => normalizeBoostPlan(plan));
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await apiRequest<AdminDashboardStats>('/admin/dashboard', {
    requiresAuth: true,
  });

  return response.data;
};

export const getAllBoostPlans = async (): Promise<BoostPlan[]> => {
  const response = await apiRequest<BackendBoostPlan[]>('/boost-plans/all', {
    requiresAuth: true,
  });

  return response.data.map((plan) => normalizeBoostPlan(plan));
};

export const createBoostPlan = async (payload: Partial<BackendBoostPlan>) => {
  const response = await apiRequest<BackendBoostPlan>('/boost-plans', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return normalizeBoostPlan(response.data);
};

export const updateBoostPlan = async (planId: number | string, payload: Partial<BackendBoostPlan>) => {
  const response = await apiRequest<BackendBoostPlan>(`/boost-plans/${planId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return normalizeBoostPlan(response.data);
};

export const deleteBoostPlan = async (planId: number | string) => {
  await apiRequest(`/boost-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const activateStoreBoost = async (
  storeId: number | string,
  payload: { planId: number | string; startsAt?: string }
): Promise<StoreBoost> => {
  const response = await apiRequest<BackendStoreBoost>(`/stores/${storeId}/boosts`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      ...(payload.startsAt ? { starts_at: payload.startsAt } : {}),
    },
    requiresAuth: true,
  });

  return normalizeStoreBoost(response.data);
};

export const getStoreBoostOverview = async (storeId: number | string) => {
  const response = await apiRequest<{ store: BackendStore; activeBoost: BackendStoreBoost | null }>(
    `/stores/${storeId}/boosts`,
    {
      requiresAuth: true,
    }
  );

  return {
    store: normalizeStore(response.data.store),
    activeBoost: response.data.activeBoost ? normalizeStoreBoost(response.data.activeBoost) : null,
  };
};

export const getStoreBoosts = async (): Promise<StoreBoost[]> => {
  const response = await apiRequest<BackendStoreBoost[]>('/boosts', {
    requiresAuth: true,
  });

  return response.data.map((boost) => normalizeStoreBoost(boost, { includeStore: true }));
};

export const cancelBoost = async (boostId: number | string): Promise<StoreBoost> => {
  const response = await apiRequest<BackendStoreBoost>(`/boosts/${boostId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

  return normalizeStoreBoost(response.data);
};

type LaravelProductPaginator = {
  current_page?: number;
  data?: BackendProduct[];
  last_page?: number;
  per_page?: number;
  total?: number;
};

export const getProductsByStore = async (storeId: number | string) => {
  const perPage = 100;
  let page = 1;
  let lastPage = 1;
  const productRows: BackendProduct[] = [];

  do {
    const response = await apiRequest<BackendProduct[] | LaravelProductPaginator>(`/products/${storeId}?page=${page}&per_page=${perPage}`);
    const data = response.data as unknown;
    const pageRows = Array.isArray(data)
      ? data
      : Array.isArray((data as { data?: unknown[] } | null)?.data)
        ? ((data as { data: unknown[] }).data as BackendProduct[])
        : Array.isArray((data as { items?: unknown[] } | null)?.items)
          ? ((data as { items: unknown[] }).items as BackendProduct[])
          : Array.isArray((data as { products?: unknown[] } | null)?.products)
            ? ((data as { products: unknown[] }).products as BackendProduct[])
            : [];

    productRows.push(...pageRows);
    if (data && typeof data === 'object' && typeof (data as { last_page?: unknown }).last_page === 'number') {
      lastPage = Math.max(1, Number((data as { last_page?: number }).last_page ?? 1));
      page += 1;
    } else {
      break;
    }
  } while (page <= lastPage);

  return productRows.map((product) =>
    normalizeProduct(product, {
      id: Number(storeId),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'product' },
      is_active: true,
      is_verified: false,
    } as BackendStore)
  );
};

export const getServicesByStore = async (storeId: number | string) => {
  const response = await apiRequest<BackendService[]>(`/services/${storeId}`);
  const data = response.data as unknown;
  const serviceRows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] } | null)?.items)
      ? ((data as { items: unknown[] }).items as BackendService[])
      : Array.isArray((data as { services?: unknown[] } | null)?.services)
        ? ((data as { services: unknown[] }).services as BackendService[])
        : [];
  return serviceRows.map((service) =>
    normalizeService(service, {
      id: Number(storeId),
      user_id: 0,
      name: '',
      slug: '',
      category: { id: 0, name: 'General', business_type: 'service' },
      is_active: true,
      is_verified: false,
    } as BackendStore)
  );
};

export const getServiceById = async (serviceId: number | string) => {
  const response = await apiRequest<BackendService & { store?: BackendStore }>(`/service/${serviceId}`);

  if (!response.data) {
    throw new ApiError('Service not found', 404);
  }

  const service = response.data;
  const store = service.store || {
    id: Number(service.store_id ?? 0),
    user_id: 0,
    name: '',
    slug: '',
    category: { id: 0, name: 'General', business_type: 'service' },
    is_active: true,
    is_verified: false,
  } as BackendStore;

  return {
    service: normalizeService(service, store),
    store: service.store ? normalizeStore(service.store) : null,
  };
};

const defaultProductCheckout = (): ProductCheckoutPublic => ({
  onlinePaymentAvailable: false,
  qrPaymentAvailable: false,
  paymentQrUrl: null,
});

function normalizeProductCheckout(raw: BackendProductCheckoutPayload | null | undefined): ProductCheckoutPublic {
  if (!raw || typeof raw !== 'object') return defaultProductCheckout();
  const url = raw.payment_qr_url;
  return {
    onlinePaymentAvailable: Boolean(raw.online_payment_available),
    qrPaymentAvailable: Boolean(raw.qr_payment_available),
    paymentQrUrl: typeof url === 'string' && url.trim() !== '' ? url.trim() : null,
  };
}

export const getProductById = async (productId: number | string) => {
  const response = await apiRequest<BackendProduct & { store?: BackendStore }>(`/product/${productId}`, {
    sendAuthIfAvailable: true,
  });

  if (!response.data) {
    throw new ApiError('Product not found', 404);
  }

  const product = response.data;
  const store = product.store || {
    id: Number(product.store_id ?? 0),
    user_id: 0,
    name: '',
    slug: '',
    category: { id: 0, name: 'General', business_type: 'product' },
    is_active: true,
    is_verified: false,
  } as BackendStore;

  return {
    product: normalizeProduct(product, store),
    store: product.store ? normalizeStore(product.store) : null,
    checkout: normalizeProductCheckout(product.checkout),
  };
};

export type ProductCheckoutRazorpayOrderData = {
  razorpay_order_id: string;
  amount: number;
  currency: string;
  razorpay_key_id: string;
  product_name: string;
  store_name: string;
};

export type ProductCheckoutBuyerApiPayload = {
  full_name: string;
  phone: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  order_notes?: string;
};

export const createProductCheckoutRazorpayOrder = async (
  productId: string | number,
  purchaseOption: string,
  options?: { quantity?: number; buyer: ProductCheckoutBuyerApiPayload },
): Promise<ProductCheckoutRazorpayOrderData> => {
  const body: Record<string, unknown> = { purchase_option: purchaseOption };
  if (options?.quantity != null) {
    body.quantity = options.quantity;
  }
  if (!options?.buyer) {
    throw new ApiError('Buyer details are required to start checkout.', 400);
  }
  body.buyer = options.buyer;
  const response = await apiRequest<ProductCheckoutRazorpayOrderData>(
    `/product/${productId}/checkout/razorpay-order`,
    {
      method: 'POST',
      body,
      sendAuthIfAvailable: true,
    },
  );
  const data = response.data;
  if (!data?.razorpay_order_id) {
    throw new ApiError('Could not start payment.', 502, data);
  }
  return data;
};

export const verifyProductCheckoutRazorpayPayment = async (
  productId: string | number,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<void> => {
  await apiRequest(`/product/${productId}/checkout/razorpay-verify`, {
    method: 'POST',
    body: payload,
    sendAuthIfAvailable: true,
  });
};

export type StorePurchaseInquiryBuyer = {
  full_name: string;
  phone: string;
  email?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  order_notes?: string;
};

export type StorePurchaseInquiryRow = {
  id: number;
  store_id: number;
  product_id: number;
  quantity: number;
  amount_paise: number;
  currency: string;
  purchase_option: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
  buyer: StorePurchaseInquiryBuyer;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  product?: { id: number; title: string; image?: string | null; price?: number } | null;
};

export type StorePurchaseInquiriesResponse = {
  data: StorePurchaseInquiryRow[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export const getStorePurchaseInquiries = async (
  storeId: string | number,
  params?: { page?: number; perPage?: number },
): Promise<StorePurchaseInquiriesResponse> => {
  const query = buildQuery({ page: params?.page, per_page: params?.perPage });
  const response = await apiRequest<StorePurchaseInquiriesResponse>(
    `/stores/${storeId}/purchase-inquiries${query}`,
    { requiresAuth: true },
  );
  const d = response.data;
  if (!d?.data || !d.pagination) {
    throw new ApiError('Invalid purchase inquiries response', 502, d);
  }
  return d;
};

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  if (!params) return '';
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.append(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const getProductReviews = async (
  productId: number | string,
  params?: ReviewListParams
): Promise<ReviewListResponse> => {
  const query = buildQuery({ page: params?.page, per_page: params?.perPage });
  const response = await apiRequest<BackendReviewListResponse>(`/product/${productId}/reviews${query}`);
  return normalizeReviewListResponse(response.data);
};

export const getStoreReviews = async (
  storeId: number | string,
  params?: ReviewListParams
): Promise<ReviewListResponse> => {
  const query = buildQuery({ page: params?.page, per_page: params?.perPage });
  const response = await apiRequest<BackendReviewListResponse>(`/store/${storeId}/reviews${query}`);
  return normalizeReviewListResponse(response.data);
};

export const submitProductReview = async (
  productId: number | string,
  payload: ReviewSubmitPayload
): Promise<{ review: Review; summary: ReviewListResponse['summary'] }> => {
  const response = await apiRequest<{ review: BackendReview; summary: { [key: string]: number } }>(
    `/product/${productId}/reviews`,
    {
      method: 'POST',
      body: {
        rating: payload.rating,
        comment: payload.comment,
      },
      requiresAuth: true,
    }
  );

  return {
    review: normalizeReview(response.data.review),
    summary: {
      rating: Number(response.data.summary?.product_rating ?? 0),
      totalReviews: Number(response.data.summary?.product_reviews ?? 0),
    },
  };
};

export const submitStoreReview = async (
  storeId: number | string,
  payload: ReviewSubmitPayload
): Promise<{ review: Review; summary: ReviewListResponse['summary'] }> => {
  const response = await apiRequest<{ review: BackendReview; summary: { [key: string]: number } }>(
    `/store/${storeId}/reviews`,
    {
      method: 'POST',
      body: {
        rating: payload.rating,
        comment: payload.comment,
      },
      requiresAuth: true,
    }
  );

  return {
    review: normalizeReview(response.data.review),
    summary: {
      rating: Number(response.data.summary?.store_rating ?? 0),
      totalReviews: Number(response.data.summary?.store_reviews ?? 0),
    },
  };
};

export const handleApiError = (error: unknown) => {
  if (isApiError(error)) {
    throw error;
  }
  throw new ApiError(error instanceof Error ? error.message : 'Unexpected error');
};

const mapSubscriptionPlanRow = (plan: any): SubscriptionPlan => ({
  id: String(plan.id),
  name: plan.name,
  slug: plan.slug,
  price: Number(plan.price),
  billingCycle: plan.billing_cycle,
  durationDays:
    plan.duration_days != null && plan.duration_days !== '' ? Number(plan.duration_days) : undefined,
  displayOrder:
    plan.display_order != null && plan.display_order !== '' ? Number(plan.display_order) : null,
  billingDiscountTier: plan.billing_discount_tier
    ? (plan.billing_discount_tier as NonNullable<SubscriptionPlan['billingDiscountTier']>)
    : undefined,
  maxProducts: Number(plan.max_products),
  isPopular: Boolean(plan.is_popular),
  isActive: Boolean(plan.is_active),
  features: Array.isArray(plan.features) ? plan.features : [],
  description: plan.description || "",
});

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiRequest<any[]>("/subscription-plans", {
    requiresAuth: true,
  });

  return response.data.map(mapSubscriptionPlanRow);
};

/** Active + inactive rows — same catalog the admin manages; for dashboard subscription page. */
export const getSubscriptionPlanCatalog = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiRequest<any[]>("/subscription-plans/catalog", {
    requiresAuth: true,
  });

  return response.data.map(mapSubscriptionPlanRow);
};

export const getAllSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await apiRequest<any[]>("/subscription-plans/all", {
    requiresAuth: true,
  });

  return response.data.map(mapSubscriptionPlanRow);
};

export const createSubscriptionPlan = async (payload: Partial<any>) => {
  const response = await apiRequest<any>('/subscription-plans', {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  return {
    id: String(response.data.id),
    name: response.data.name,
    slug: response.data.slug,
    price: Number(response.data.price),
    billingCycle: response.data.billing_cycle,
    durationDays: response.data.duration_days ? Number(response.data.duration_days) : undefined,
    displayOrder: response.data.display_order != null ? Number(response.data.display_order) : null,
    maxProducts: Number(response.data.max_products),
    isPopular: Boolean(response.data.is_popular),
    isActive: Boolean(response.data.is_active),
    features: Array.isArray(response.data.features) ? response.data.features : [],
    description: response.data.description || '',
  };
};

export const updateSubscriptionPlan = async (planId: number | string, payload: Partial<any>) => {
  const response = await apiRequest<any>(`/subscription-plans/${planId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true,
  });

  return {
    id: String(response.data.id),
    name: response.data.name,
    slug: response.data.slug,
    price: Number(response.data.price),
    billingCycle: response.data.billing_cycle,
    durationDays: response.data.duration_days ? Number(response.data.duration_days) : undefined,
    displayOrder: response.data.display_order != null ? Number(response.data.display_order) : null,
    maxProducts: Number(response.data.max_products),
    isPopular: Boolean(response.data.is_popular),
    isActive: Boolean(response.data.is_active),
    features: Array.isArray(response.data.features) ? response.data.features : [],
    description: response.data.description || '',
  };
};

export const deleteSubscriptionPlan = async (planId: number | string) => {
  await apiRequest(`/subscription-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

/** Super admin: global free-trial length for new stores (days). */
export const getAdminFreeTrialDays = async (): Promise<number> => {
  const response = await apiRequest<{ free_trial_days: number }>('/admin/settings/free-trial', {
    requiresAuth: true,
  });
  const raw = response.data as { free_trial_days?: number };
  const n = Number(raw?.free_trial_days);
  const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_TRIAL_DAYS;
  setFreeTrialDaysClientCache(days);
  return days;
};

export const updateAdminFreeTrialDays = async (freeTrialDays: number): Promise<number> => {
  const response = await apiRequest<{ free_trial_days: number }>('/admin/settings/free-trial', {
    method: 'PUT',
    body: { free_trial_days: freeTrialDays },
    requiresAuth: true,
  });
  const raw = response.data as { free_trial_days?: number };
  const n = Number(raw?.free_trial_days);
  const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_TRIAL_DAYS;
  clearFreeTrialDaysClientCache();
  setFreeTrialDaysClientCache(days);
  return days;
};

const clampAddonRupees = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(99_999_999, Math.floor(n));
};

const parseSubscriptionAddonPayload = (raw: unknown): SubscriptionAddonCharges => {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    payment_gateway_integration_inr: clampAddonRupees(o.payment_gateway_integration_inr),
    qr_code_inr: clampAddonRupees(o.qr_code_inr),
    payment_gateway_help_inr: clampAddonRupees(o.payment_gateway_help_inr),
  };
};

const parseSubscriptionCheckoutPricingPayload = (raw: unknown): SubscriptionCheckoutPricing => ({
  ...parseSubscriptionAddonPayload(raw),
  ...parseSubscriptionBillingDiscountsPayload(raw),
});

/** Super admin: global subscription checkout add-ons (₹). */
export const getAdminSubscriptionAddonCharges = async (): Promise<SubscriptionAddonCharges> => {
  const response = await apiRequest<SubscriptionAddonCharges>('/admin/settings/subscription-addons', {
    requiresAuth: true,
  });
  return parseSubscriptionAddonPayload(response.data);
};

export const updateAdminSubscriptionAddonCharges = async (
  charges: SubscriptionAddonCharges
): Promise<SubscriptionAddonCharges> => {
  const response = await apiRequest<SubscriptionAddonCharges>('/admin/settings/subscription-addons', {
    method: 'PUT',
    body: {
      payment_gateway_integration_inr: clampAddonRupees(charges.payment_gateway_integration_inr),
      qr_code_inr: clampAddonRupees(charges.qr_code_inr),
      payment_gateway_help_inr: clampAddonRupees(charges.payment_gateway_help_inr),
    },
    requiresAuth: true,
  });
  return parseSubscriptionAddonPayload(response.data);
};

const clampPercent0to100 = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.floor(n)));
};

const parseSubscriptionBillingDiscountsPayload = (raw: unknown): SubscriptionBillingDiscounts => {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    discount_1_month_pct: clampPercent0to100(o.discount_1_month_pct),
    discount_3_months_pct: clampPercent0to100(o.discount_3_months_pct),
    discount_1_year_pct: clampPercent0to100(o.discount_1_year_pct),
  };
};

const requireBillingDiscountsEnvelope = (
  response: ApiEnvelope<SubscriptionBillingDiscounts>
): SubscriptionBillingDiscounts => {
  const raw = response.data;
  if (raw === null || typeof raw !== 'object') {
    throw new ApiError(
      'Server returned no billing-discount data. Use the Laravel API host that has the latest backend code, and open the MySQL database named in that server’s DB_DATABASE (not a different DB with a similar name).',
      502,
      response
    );
  }
  const o = raw as unknown as Record<string, unknown>;
  for (const k of ['discount_1_month_pct', 'discount_3_months_pct', 'discount_1_year_pct'] as const) {
    if (!(k in o)) {
      throw new ApiError(
        `API response is missing "${k}". Deploy the latest backend (subscription-billing-discounts routes + controller), then run: php artisan route:clear && php artisan config:clear`,
        502,
        response
      );
    }
  }
  return parseSubscriptionBillingDiscountsPayload(raw);
};

/** Super admin: global subscription billing-term discounts (% off). */
export const getAdminSubscriptionBillingDiscounts = async (): Promise<SubscriptionBillingDiscounts> => {
  const response = await apiRequest<SubscriptionBillingDiscounts>('/admin/settings/subscription-billing-discounts', {
    requiresAuth: true,
  });
  return requireBillingDiscountsEnvelope(response);
};

export const updateAdminSubscriptionBillingDiscounts = async (
  discounts: SubscriptionBillingDiscounts
): Promise<SubscriptionBillingDiscounts> => {
  const response = await apiRequest<SubscriptionBillingDiscounts>('/admin/settings/subscription-billing-discounts', {
    method: 'POST',
    body: {
      discount_1_month_pct: clampPercent0to100(discounts.discount_1_month_pct),
      discount_3_months_pct: clampPercent0to100(discounts.discount_3_months_pct),
      discount_1_year_pct: clampPercent0to100(discounts.discount_1_year_pct),
    },
    requiresAuth: true,
  });
  return requireBillingDiscountsEnvelope(response);
};

/** Authenticated store owner: read global subscription add-on prices and billing-term discount %. */
export const getSubscriptionAddonPrices = async (): Promise<SubscriptionCheckoutPricing> => {
  const response = await apiRequest<SubscriptionCheckoutPricing>('/subscription-plans/addon-prices', {
    requiresAuth: true,
  });
  return parseSubscriptionCheckoutPricingPayload(response.data);
};

export const getStoreSubscription = async (storeId: number | string) => {
  const response = await apiRequest<Record<string, unknown>>(`/stores/${storeId}/subscription`, {
    requiresAuth: true,
  });

  const payload = response.data as Record<string, unknown>;
  const rawSub = payload?.activeSubscription ?? payload?.active_subscription;

  if (!rawSub || typeof rawSub !== 'object') {
    return { activeSubscription: null };
  }

  const sub = rawSub as Record<string, any>;
  const plan = sub.plan;
  if (!plan || typeof plan !== 'object') {
    return { activeSubscription: null };
  }

  return {
    activeSubscription: {
      id: String(sub.id),
      storeId: String(sub.store_id),
      subscriptionPlanId: String(sub.subscription_plan_id),
      price: Number(sub.price),
      status: sub.status,
      startsAt: sub.starts_at,
      endsAt: sub.ends_at,
      autoRenew: Boolean(sub.auto_renew),
      activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
      plan: {
        id: String(plan.id),
        name: plan.name,
        slug: plan.slug,
        price: Number(plan.price),
        billingCycle: plan.billing_cycle,
        durationDays: plan.duration_days ? Number(plan.duration_days) : undefined,
        maxProducts: Number(plan.max_products),
        isPopular: Boolean(plan.is_popular),
        isActive: Boolean(plan.is_active),
        features: Array.isArray(plan.features) ? plan.features : [],
        description: plan.description || '',
      },
    },
  };
};

export const activateStoreSubscription = async (
  storeId: number | string,
  payload: {
    planId: number | string;
    startsAt?: string;
    addons?: StoreSubscriptionAddons;
  }
): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/stores/${storeId}/subscription`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      ...(payload.startsAt ? { starts_at: payload.startsAt } : {}),
      ...(payload.addons !== undefined
        ? {
            addon_payment_gateway: Boolean(payload.addons.paymentGateway),
            addon_qr_code: Boolean(payload.addons.qrCode),
            addon_payment_gateway_help: Boolean(payload.addons.paymentGatewayHelp),
          }
        : {}),
    },
    requiresAuth: true,
  });

  const sub = response.data;
  const mapped: StoreSubscription = {
    id: String(sub.id),
    storeId: String(sub.store_id),
    subscriptionPlanId: String(sub.subscription_plan_id),
    price: Number(sub.price),
    status: sub.status,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    autoRenew: Boolean(sub.auto_renew),
    activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
    plan: {
      id: String(sub.plan.id),
      name: sub.plan.name,
      slug: sub.plan.slug,
      price: Number(sub.plan.price),
      billingCycle: sub.plan.billing_cycle,
      durationDays: sub.plan.duration_days ? Number(sub.plan.duration_days) : undefined,
      maxProducts: Number(sub.plan.max_products),
      isPopular: Boolean(sub.plan.is_popular),
      isActive: Boolean(sub.plan.is_active),
      features: Array.isArray(sub.plan.features) ? sub.plan.features : [],
      description: sub.plan.description || '',
    },
  };

  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();

  return mapped;
};

/** Save subscription add-on toggles (e.g. paid checkout intent). Requires migrated `stores.subscription_addons`. */
const normalizeStorePaymentIntegration = (raw: unknown): StorePaymentIntegrationSettings => {
  const o = raw as Record<string, unknown> | null | undefined;
  const a = (o?.subscription_addons ?? {}) as Record<string, unknown>;
  return {
    subscriptionAddons: {
      paymentGateway: Boolean(a.payment_gateway),
      qrCode: Boolean(a.qr_code),
      paymentGatewayHelp: Boolean(a.payment_gateway_help),
    },
    razorpayKeyId: o?.razorpay_key_id != null && o.razorpay_key_id !== '' ? String(o.razorpay_key_id) : null,
    hasRazorpaySecret: Boolean(o?.has_razorpay_secret),
    paymentQrUrl: o?.payment_qr_url != null && o.payment_qr_url !== '' ? String(o.payment_qr_url) : null,
    helpWhatsappE164: String(o?.help_whatsapp_e164 ?? ''),
    helpWhatsappUrl: String(o?.help_whatsapp_url ?? ''),
  };
};

export const getStorePaymentIntegration = async (
  storeId: number | string
): Promise<StorePaymentIntegrationSettings> => {
  const response = await apiRequest(`/stores/${storeId}/payment-integration`, { requiresAuth: true });
  return normalizeStorePaymentIntegration(response.data);
};

/**
 * Save payment hub settings. Use JSON (Razorpay, flags, QR as base64) — reliable through Next `/api/laravel` rewrites.
 * `FormData` is optional if you still POST multipart `payment_qr` directly to Laravel.
 */
export const updateStorePaymentIntegration = async (
  storeId: number | string,
  body: FormData | StorePaymentIntegrationUpdateJson
): Promise<StorePaymentIntegrationSettings> => {
  const response = await apiRequest(`/stores/${storeId}/payment-integration`, {
    method: 'POST',
    body:
      body instanceof FormData
        ? body
        : (Object.fromEntries(
            Object.entries(body).filter(([, v]) => v !== undefined)
          ) as Record<string, unknown>),
    requiresAuth: true,
  });
  return normalizeStorePaymentIntegration(response.data);
};

export const saveStoreSubscriptionAddons = async (
  storeId: number | string,
  addons: StoreSubscriptionAddons
): Promise<StoreSubscriptionAddons> => {
  const response = await apiRequest<{ subscription_addons: Record<string, boolean> }>(
    `/stores/${storeId}/subscription/addons`,
    {
      method: 'POST',
      body: {
        addon_payment_gateway: addons.paymentGateway,
        addon_qr_code: addons.qrCode,
        addon_payment_gateway_help: addons.paymentGatewayHelp,
      },
      requiresAuth: true,
    }
  );
  const raw = response.data?.subscription_addons ?? {};
  return {
    paymentGateway: Boolean(raw.payment_gateway),
    qrCode: Boolean(raw.qr_code),
    paymentGatewayHelp: Boolean(raw.payment_gateway_help),
  };
};

export type SubscriptionCheckoutPricingBreakdown = {
  grossSubtotalRupees: number;
  discountPercent: number;
  discountRupees: number;
  taxableSubtotalRupees: number;
  gstRupees: number;
  totalRupees: number;
};

export type SubscriptionRazorpayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  pricing?: SubscriptionCheckoutPricingBreakdown;
};

/** Creates a Razorpay order for paid plan + selected add-ons (Laravel uses server-side keys). */
export const createStoreSubscriptionRazorpayOrder = async (
  storeId: number | string,
  payload: { planId: number | string; addons: StoreSubscriptionAddons }
): Promise<SubscriptionRazorpayOrder> => {
  const response = await apiRequest<{
    key_id: string;
    order_id: string;
    amount: number;
    currency: string;
    plan_name: string;
    pricing?: {
      gross_subtotal_rupees?: number;
      discount_percent?: number;
      discount_rupees?: number;
      taxable_subtotal_rupees?: number;
      gst_rupees?: number;
      total_rupees?: number;
    };
  }>(`/stores/${storeId}/subscription/razorpay-order`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      addon_payment_gateway: Boolean(payload.addons.paymentGateway),
      addon_qr_code: Boolean(payload.addons.qrCode),
      addon_payment_gateway_help: Boolean(payload.addons.paymentGatewayHelp),
    },
    requiresAuth: true,
  });

  const d = response.data;
  const rawP = d.pricing;
  const pricing: SubscriptionCheckoutPricingBreakdown | undefined =
    rawP && typeof rawP === 'object'
      ? {
          grossSubtotalRupees: Math.round(Number(rawP.gross_subtotal_rupees ?? 0)),
          discountPercent: Math.round(Number(rawP.discount_percent ?? 0)),
          discountRupees: Math.round(Number(rawP.discount_rupees ?? 0)),
          taxableSubtotalRupees: Math.round(Number(rawP.taxable_subtotal_rupees ?? 0)),
          gstRupees: Math.round(Number(rawP.gst_rupees ?? 0)),
          totalRupees: Math.round(Number(rawP.total_rupees ?? 0)),
        }
      : undefined;
  return {
    keyId: String(d.key_id),
    orderId: String(d.order_id),
    amount: Number(d.amount),
    currency: String(d.currency ?? 'INR'),
    planName: String(d.plan_name ?? ''),
    pricing,
  };
};

function parseActivatedStoreSubscriptionResponse(sub: Record<string, any>): StoreSubscription {
  const plan = sub.plan;
  return {
    id: String(sub.id),
    storeId: String(sub.store_id),
    subscriptionPlanId: String(sub.subscription_plan_id),
    price: Number(sub.price),
    status: sub.status,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    autoRenew: Boolean(sub.auto_renew),
    activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
    plan: {
      id: String(plan.id),
      name: plan.name,
      slug: plan.slug,
      price: Number(plan.price),
      billingCycle: plan.billing_cycle,
      durationDays: plan.duration_days ? Number(plan.duration_days) : undefined,
      maxProducts: Number(plan.max_products),
      isPopular: Boolean(plan.is_popular),
      isActive: Boolean(plan.is_active),
      features: Array.isArray(plan.features) ? plan.features : [],
      description: plan.description || '',
    },
  };
}

/** After Razorpay Checkout succeeds, verifies signature + payment and activates the subscription. */
export const verifyStoreSubscriptionRazorpayPayment = async (
  storeId: number | string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/stores/${storeId}/subscription/razorpay-verify`, {
    method: 'POST',
    body: payload,
    requiresAuth: true,
  });

  const mapped = parseActivatedStoreSubscriptionResponse(response.data as Record<string, any>);

  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();

  return mapped;
};

/**
 * Same activation as Razorpay verify, without payment. Laravel allows it by default; set
 * `SUBSCRIPTION_MOCK_PAYMENT=false` in `backend/.env` to disable. Hide UI with `NEXT_PUBLIC_SUBSCRIPTION_MOCK_PAYMENT=false`.
 */
export const completeStoreSubscriptionMockPayment = async (
  storeId: number | string,
  payload: { planId: number | string; addons: StoreSubscriptionAddons }
): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/stores/${storeId}/subscription/mock-complete`, {
    method: 'POST',
    body: {
      plan_id: payload.planId,
      addon_payment_gateway: Boolean(payload.addons.paymentGateway),
      addon_qr_code: Boolean(payload.addons.qrCode),
      addon_payment_gateway_help: Boolean(payload.addons.paymentGatewayHelp),
    },
    requiresAuth: true,
  });

  const mapped = parseActivatedStoreSubscriptionResponse(response.data as Record<string, any>);

  await purgeStoresCatalogCacheClient();
  dispatchStoreProfileRefresh();

  return mapped;
};

export const cancelStoreSubscription = async (subscriptionId: number | string): Promise<StoreSubscription> => {
  const response = await apiRequest<any>(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });

  const sub = response.data;
  return {
    id: String(sub.id),
    storeId: String(sub.store_id),
    subscriptionPlanId: String(sub.subscription_plan_id),
    price: Number(sub.price),
    status: sub.status,
    startsAt: sub.starts_at,
    endsAt: sub.ends_at,
    autoRenew: Boolean(sub.auto_renew),
    activatedBy: sub.activated_by ? String(sub.activated_by) : undefined,
    plan: {
      id: String(sub.plan.id),
      name: sub.plan.name,
      slug: sub.plan.slug,
      price: Number(sub.plan.price),
      billingCycle: sub.plan.billing_cycle,
      maxProducts: Number(sub.plan.max_products),
      isPopular: Boolean(sub.plan.is_popular),
      isActive: Boolean(sub.plan.is_active),
      features: Array.isArray(sub.plan.features) ? sub.plan.features : [],
      description: sub.plan.description || '',
    },
  };
};

// ============================================
