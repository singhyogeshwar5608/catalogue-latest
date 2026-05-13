import type { Store, Product, Service, ServiceBillingUnit, StoreSubscription } from '@/types';
import type { BackendStore, BackendProduct, BackendService } from '@/types/api';
import { formatStoreName } from '@/src/lib/format';
import { parseCoord, parseDistanceKm } from '@/src/lib/geo';
import { trialEndsAtFallbackFromCreated } from '@/src/lib/freeTrialDays';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

export type ApiEnvelope<T> = {
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

export type { BackendStore, BackendProduct, BackendService };

const fallbackLogo = 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop';
const fallbackBanner = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&h=400&fit=crop';
const fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';

const toNumber = (value?: string | number | null) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Turn storage paths into absolute URLs on the Laravel public host so the browser loads files
 * directly from CDN (`NEXT_PUBLIC_API_BASE_URL` origin). Same-origin `/storage` proxies were
 * returning 422 for some setups; direct https + `referrerPolicy="no-referrer"` on `<img>` is reliable.
 */
export function absolutizeStorageUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (t.startsWith('data:')) return t;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  // DB often stores short relative product paths: "products/uuid.jpg"
  // Convert them to Laravel public storage path.
  if (t.startsWith('products/')) {
    return `/storage/${t}`;
  }

  if (t.startsWith('/storage/')) {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      const isLocalHost = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
      if (isLocalHost) {
        // In local dev, keep same-origin and let Next rewrite proxy to Laravel.
        return t;
      }
    }
    const base = API_BASE_URL.replace(/\/+$/, '');
    try {
      const origin = new URL(base.includes('://') ? base : `https://${base}`).origin;
      return `${origin}${t}`;
    } catch {
      return t;
    }
  }

  return t;
}

/** Matches Laravel: explicit `trial_ends_at`, else `created_at` + platform `free_trial_days` (see `trialEndsAtFallbackFromCreated`). */
function trialEndsAtForStore(store: BackendStore): string | null {
  if (store.trial_ends_at) return store.trial_ends_at;
  if (!store.created_at) return null;
  return trialEndsAtFallbackFromCreated(store.created_at);
}

function normalizeActiveSubscription(store: BackendStore): StoreSubscription | null {
  const raw =
    (store as { active_subscription?: unknown }).active_subscription ??
    (store as { activeSubscription?: unknown }).activeSubscription;
  if (!raw || typeof raw !== 'object') return null;
  const sub = raw as Record<string, unknown>;
  const plan = sub.plan as Record<string, unknown> | undefined;
  if (!plan || typeof plan !== 'object') return null;

  const statusRaw = String(sub.status ?? 'active');
  const status: StoreSubscription['status'] =
    statusRaw === 'expired' || statusRaw === 'cancelled' ? statusRaw : 'active';

  const billingRaw = plan.billing_cycle;
  const billingCycle = billingRaw === 'yearly' ? 'yearly' : 'monthly';

  return {
    id: String(sub.id ?? ''),
    storeId: String(sub.store_id ?? store.id),
    subscriptionPlanId: String(sub.subscription_plan_id ?? ''),
    price: Number(sub.price ?? 0),
    status,
    startsAt: String(sub.starts_at ?? ''),
    endsAt: String(sub.ends_at ?? ''),
    autoRenew: Boolean(sub.auto_renew ?? true),
    activatedBy: sub.activated_by != null ? String(sub.activated_by) : undefined,
    plan: {
      id: String(plan.id ?? ''),
      name: String(plan.name ?? ''),
      slug: String(plan.slug ?? ''),
      price: Number(plan.price ?? 0),
      billingCycle,
      durationDays: plan.duration_days != null ? Number(plan.duration_days) : undefined,
      maxProducts: Number(plan.max_products ?? 0),
      isPopular: Boolean(plan.is_popular),
      isActive: Boolean(plan.is_active),
      features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
      description: String(plan.description ?? ''),
    },
  };
}

const SERVICE_BILLING_UNITS: readonly ServiceBillingUnit[] = [
  'session',
  'hour',
  'day',
  'week',
  'month',
  'project',
  'custom',
];

function isServiceBillingUnit(v: string): v is ServiceBillingUnit {
  return (SERVICE_BILLING_UNITS as readonly string[]).includes(v);
}

function storeCategoryLabel(store: BackendStore): string {
  const c = store.category;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object' && 'name' in c) return String((c as { name?: string }).name ?? 'General');
  return 'General';
}

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

export function normalizeBackendService(service: BackendService, store: BackendStore): Service {
  const raw = service.billing_unit;
  const billingUnit =
    typeof raw === 'string' && isServiceBillingUnit(raw) ? raw : undefined;

  return {
    id: String(service.id),
    storeId: String(service.store_id ?? store.id),
    storeName: formatStoreName(store.name),
    storeSlug: store.slug?.trim() || undefined,
    title: service.title,
    description: service.description ?? '',
    price: service.price != null ? Number(service.price) : null,
    image: service.image ?? fallbackImage,
    isActive: Boolean(service.is_active),
    billingUnit,
    customBillingUnit: service.custom_billing_unit ?? null,
    minQuantity:
      service.min_quantity != null && !Number.isNaN(Number(service.min_quantity))
        ? Number(service.min_quantity)
        : null,
    packagePrice:
      service.package_price != null && !Number.isNaN(Number(service.package_price))
        ? Number(service.package_price)
        : null,
  };
}

export const normalizeProduct = (product: BackendProduct, store: BackendStore): Product => ({
  id: String(product.id),
  storeId: String(product.store_id ?? store.id),
  storeName: formatStoreName(store.name),
  storeSlug: store.slug?.trim() || undefined,
  name: product.title,
  description: product.description ?? '',
  price: Number(product.price ?? 0),
  originalPrice: product.original_price != null ? Number(product.original_price) : undefined,
  image: product.image ?? fallbackImage,
  images: product.images && product.images.length ? product.images : [product.image ?? fallbackImage],
  category: product.category ?? storeCategoryLabel(store),
  rating: toNumber(product.rating) || 4.7,
  totalReviews: toNumber(product.total_reviews),
  inStock: Boolean(product.is_active),
});

/**
 * Normalizes Laravel store payloads for Next `/api/stores` (Redis cache).
 * Keeps nested `products` / `services` when the list API includes them (home trending rail).
 */
export const normalizeStore = (store: BackendStore): Store => {
  const description = store.description ?? '';
  const categoryObj =
    store.category && typeof store.category === 'object' ? store.category : undefined;
  const businessType =
    store.business_type ?? categoryObj?.business_type ?? (typeof store.category === 'string' ? store.category : 'product');
  const shortDescription =
    store.short_description ?? (description.slice(0, 120) || String(businessType));
  const ratingValue = toNumber(store.rating);
  const totalReviews = toNumber(store.total_reviews);
  const location = store.location ?? store.address ?? 'Pan India';
  const whatsapp = (store.whatsapp ?? store.phone ?? '').trim() || '+91 90000 00000';
  const bannerRaw = store.banner ?? categoryObj?.banner_image ?? fallbackBanner;
  const banner =
    typeof bannerRaw === 'string' && bannerRaw.trim()
      ? absolutizeStorageUrl(bannerRaw.trim())
      : absolutizeStorageUrl(String(fallbackBanner));
  const layoutType = store.layout_type === 'layout2' ? 'layout2' : 'layout1';
  const username = String(store.slug ?? (store as { username?: string }).username ?? '').trim();

  const logoRaw = store.logo;
  const logoTrimmed =
    typeof logoRaw === 'string' && logoRaw.trim() !== '' ? logoRaw.trim() : null;
  const resolvedLogo = logoTrimmed ? absolutizeStorageUrl(logoTrimmed) : null;

  const products =
    Array.isArray(store.products) && store.products.length > 0
      ? store.products.map((p) => normalizeProduct(p, store))
      : undefined;

  const services =
    Array.isArray(store.services) && store.services.length > 0
      ? store.services.map((s) => normalizeBackendService(s, store))
      : undefined;

  const normalizedCategory = categoryObj
    ? {
        id: categoryObj.id,
        name: categoryObj.name,
        slug: categoryObj.slug,
        business_type: categoryObj.business_type,
        banner_image:
          typeof categoryObj.banner_image === 'string' && categoryObj.banner_image.trim()
            ? absolutizeStorageUrl(categoryObj.banner_image.trim())
            : null,
        banner_images: Array.isArray(categoryObj.banner_images)
          ? categoryObj.banner_images
              .filter((url): url is string => Boolean(url && typeof url === 'string'))
              .map((url) => absolutizeStorageUrl(url.trim()))
          : categoryObj.banner_images ?? null,
        banner_title: categoryObj.banner_title ?? null,
        banner_subtitle: categoryObj.banner_subtitle ?? null,
        banner_color: categoryObj.banner_color ?? null,
        color_combinations: categoryObj.color_combinations ?? null,
        banner_pattern: categoryObj.banner_pattern ?? null,
      }
    : undefined;

  return {
    id: String(store.id),
    userId: store.user_id != null ? String(store.user_id) : undefined,
    username,
    slug: store.slug,
    name: formatStoreName(store.name),
    logo: resolvedLogo || fallbackLogo,
    banner,
    description,
    shortDescription,
    rating: ratingValue || 4.8,
    totalReviews,
    isVerified: Boolean(store.is_verified),
    isBoosted: Boolean(store.is_boosted),
    boostExpiryDate: store.boost_expiry_date ?? undefined,
    businessType: typeof businessType === 'string' ? businessType : 'product',
    categoryName: categoryObj?.name,
    categoryId: store.category_id != null ? String(store.category_id) : undefined,
    category: normalizedCategory,
    location,
    address: store.address ?? undefined,
    state: typeof store.state === 'string' && store.state.trim() !== '' ? store.state.trim() : undefined,
    district: typeof store.district === 'string' && store.district.trim() !== '' ? store.district.trim() : undefined,
    latitude: parseCoord(store.latitude),
    longitude: parseCoord(store.longitude),
    distanceKm: parseDistanceKm(store.distance_km),
    phone: store.phone ?? undefined,
    email: store.email?.trim() ? store.email.trim() : undefined,
    showPhone: store.show_phone !== false,
    whatsapp,
    socialLinks: backendStoreSocialLinks(store),
    layoutType,
    themeId: store.theme ?? undefined,
    createdAt: store.created_at ?? new Date().toISOString(),
    trialEndsAt: trialEndsAtForStore(store),
    activeSubscription: normalizeActiveSubscription(store),
    isActive: store.is_active !== false,
    products,
    services,
    productsCount: (store as { products_count?: number }).products_count ?? store.products?.length,
    servicesCount: (store as { services_count?: number }).services_count ?? store.services?.length,
    user: store.user
      ? {
          id: String(store.user.id),
          name: store.user.name ?? 'Unknown',
          email: store.user.email ?? '',
        }
      : undefined,
    followersCount: Math.max(0, Math.trunc(toNumber(store.followers_count))),
    likesCount: Math.max(0, Math.trunc(toNumber(store.likes_count))),
    seenCount: Math.max(0, Math.trunc(toNumber(store.seen_count))),
  };
};

export { fallbackImage, fallbackLogo, fallbackBanner };
