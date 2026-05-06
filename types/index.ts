/** Add-ons chosen at subscription checkout (persisted on the store). */
export interface StoreSubscriptionAddons {
  paymentGateway: boolean;
  qrCode: boolean;
  paymentGatewayHelp: boolean;
}

/** Public product page: what checkout options the seller has enabled and configured. */
export interface ProductCheckoutPublic {
  onlinePaymentAvailable: boolean;
  qrPaymentAvailable: boolean;
  paymentQrUrl: string | null;
}

/** Owner-only payment hub payload from `GET/POST …/payment-integration`. */
export interface StorePaymentIntegrationSettings {
  subscriptionAddons: StoreSubscriptionAddons;
  razorpayKeyId: string | null;
  hasRazorpaySecret: boolean;
  paymentQrUrl: string | null;
  helpWhatsappE164: string;
  helpWhatsappUrl: string;
}

/** JSON body for `POST …/payment-integration` when not uploading a QR file (avoids multipart through dev proxy). */
export interface StorePaymentIntegrationUpdateJson {
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  clear_razorpay_secret?: boolean;
  remove_payment_qr?: boolean;
  /** Raw base64 (no `data:...;base64,` prefix). Preferred over multipart through proxies. */
  payment_qr_base64?: string;
  /** e.g. `image/png` — hint only; server validates bytes as an image. */
  payment_qr_mime?: string;
}

export type BoostStatus = "active" | "expired" | "cancelled";

export interface BoostPlan {
  id: string;
  name: string;
  days: number;
  price: number;
  priorityWeight: number;
  badgeLabel: string;
  badgeColor: string;
  isActive: boolean;
  features?: string[];
}

export interface StoreBoost {
  id: string;
  storeId: string;
  startsAt: string;
  endsAt: string;
  status: BoostStatus;
  activatedBy?: string;
  plan: BoostPlan;
  store?: Store;
}

export interface Store {
  id: string;
  userId?: string;
  username: string;
  name: string;
  logo: string;
  banner: string;
  storeBannerImage?: string | null;
  categoryBannerImage?: string | null;
  categoryBannerColor?: string | null;
  description: string;
  shortDescription: string;
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  isBoosted: boolean;
  isActive?: boolean;
  boostExpiryDate?: string;
  businessType: string;
  categoryName?: string;
  location: string;
  /** Indian state (or region) for SEO — from Laravel `stores.state`. */
  state?: string | null;
  /** District / city area for SEO — from Laravel `stores.district`. */
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  phone?: string;
  /** Business / contact email stored on the store record */
  email?: string;
  showPhone?: boolean;
  whatsapp: string;
  gstVerified?: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  membershipYears?: number | null;
  trustSeal?: boolean;
  socialLinks?: {
    facebook?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
  };
  layoutType: "layout1" | "layout2";
  categoryId?: string;
  themeId?: string;
  createdAt: string;
  /** ISO datetime when the free store trial ends (from Laravel `trial_ends_at` or derived from `createdAt` + platform `free_trial_days`). */
  trialEndsAt?: string | null;
  /** Admin override: store has lifetime access (no expiry). */
  lifetimeAccess?: boolean;
  /** Same as {@link lifetimeAccess}; used by admin stores table (Laravel `lifetime_access`). */
  isLifetime?: boolean;
  activeBoost?: StoreBoost | null;
  activeSubscription?: StoreSubscription | null;
  /** Enabled subscription add-ons (payment hub, QR, company gateway help). */
  subscriptionAddons?: StoreSubscriptionAddons;
  productsCount?: number;
  servicesCount?: number;
  /** Public store profile: follower / like totals (from API). */
  followersCount?: number;
  likesCount?: number;
  /** Whether the current viewer (logged-in or guest token) follows this store. */
  viewerFollowing?: boolean;
  /** Whether the current viewer liked this store. */
  viewerLiked?: boolean;
  /** Counted page visits (capped per visitor on the server). */
  seenCount?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  category?: {
    id: number;
    name: string;
    slug?: string;
    business_type: "product" | "service" | "hybrid";
    banner_image?: string | null;
    banner_images?: string[] | null;
    banner_title?: string | null;
    banner_subtitle?: string | null;
    banner_color?: string | null;
    color_combinations?: { color1: string; color2: string }[] | null;
    banner_pattern?: "waves" | "diagonal" | "circles" | null;
  };
  products?: Product[];
  services?: Service[];
}

export type ProductUnitType =
  | "piece"
  | "box"
  | "pack"
  | "set"
  | "kilogram"
  | "gram"
  | "liter"
  | "milliliter"
  | "meter"
  | "centimeter"
  | "square_meter"
  | "custom";

export interface Product {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  totalReviews: number;
  inStock: boolean;
  unitType?: ProductUnitType;
  unitCustomLabel?: string | null;
  unitQuantity?: number | null;
  wholesaleEnabled?: boolean;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  minOrderQuantity?: number | null;
  discountEnabled?: boolean;
  discountPrice?: number | null;
  discountScheduleEnabled?: boolean;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  /** When listing products (home /products), parent store coords for viewer distance chip. */
  storeLatitude?: number | null;
  storeLongitude?: number | null;
}

export type ServiceBillingUnit =
  | "session"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "project"
  | "custom";

export interface Service {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug?: string;
  title: string;
  description: string;
  price: number | null;
  image: string;
  isActive: boolean;
  billingUnit?: ServiceBillingUnit;
  customBillingUnit?: string | null;
  minQuantity?: number | null;
  packagePrice?: number | null;
  storeLatitude?: number | null;
  storeLongitude?: number | null;
}

export interface UnifiedSearchResult {
  query: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  stores: Store[];
  products: Product[];
  services: Service[];
  types: Array<"stores" | "products" | "services">;
}

export interface Review {
  id: string;
  storeId: string;
  productId?: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  sellerReply?: {
    message: string;
    date: string;
  };
  isApproved: boolean;
}

export type RatingSummary = {
  rating: number;
  totalReviews: number;
  /** Approved review counts per star (1–5); full store/product totals from API, not current page only. */
  distribution?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
};

export type ReviewPagination = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  hasMore: boolean;
};

export type ReviewListResponse = {
  summary: RatingSummary;
  pagination: ReviewPagination;
  reviews: Review[];
};

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  storeId?: string;
  isAdmin: boolean;
  subscription: {
    plan: "free" | "basic" | "pro" | "enterprise";
    expiryDate: string;
    isActive: boolean;
  };
  referralCode: string;
  totalReferrals: number;
  referralDaysEarned: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  durationDays?: number;
  /** Optional UI sort order (1..N). Null/undefined means "not set" (sorted after numbered plans). */
  displayOrder?: number | null;
  /**
   * Which platform_settings billing discount row applies (overrides duration-based guess).
   * When omitted, tier is inferred from `billingCycle` + `durationDays` (see backend `SubscriptionCheckoutPricing`).
   */
  billingDiscountTier?: "one_month" | "three_months" | "one_year" | null;
  features: string[];
  maxProducts: number;
  isPopular?: boolean;
  isActive?: boolean;
  description?: string;
}

/** Global add-on amounts (₹) charged when a merchant opts for gateway setup, QR, or assisted integration. */
export interface SubscriptionAddonCharges {
  payment_gateway_integration_inr: number;
  qr_code_inr: number;
  payment_gateway_help_inr: number;
}

/** Super-admin: percent off (0–100) for 1-month, 3-month, and 1-year subscription terms (platform_settings). */
export interface SubscriptionBillingDiscounts {
  discount_1_month_pct: number;
  discount_3_months_pct: number;
  discount_1_year_pct: number;
  /** Raw rows read from DB after save (super-admin API only). */
  _persisted_rows?: Array<{
    key: string;
    value: string | null;
    updated_at: string | null;
  }>;
  /** Which connection/driver/database Laravel used for that read (compare with phpMyAdmin). */
  _laravel_database?: { connection: string; driver: string; database: string };
}

/** Merchant checkout: add-on ₹ plus billing-term discount % (`GET /subscription-plans/addon-prices`). */
export type SubscriptionCheckoutPricing = SubscriptionAddonCharges &
  SubscriptionBillingDiscounts;

export interface StoreSubscription {
  id: string;
  storeId: string;
  subscriptionPlanId: string;
  price: number;
  status: "active" | "expired" | "cancelled";
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  activatedBy?: string;
  plan: SubscriptionPlan;
  store?: Store;
}

export interface AdminDashboardStats {
  totals: {
    totalStores: number;
    activeStores: number;
    verifiedStores: number;
    boostedStores: number;
    totalBoosts: number;
    activeBoosts: number;
    monthlyNewStores: number;
    monthlyBoostRevenue: number;
  };
  recentStores: Array<{
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    category: string | null;
    is_verified: boolean;
    is_active: boolean;
    is_boosted: boolean;
    created_at: string;
  }>;
  recentBoosts: Array<{
    id: number;
    store_name: string | null;
    store_slug: string | null;
    plan_name: string | null;
    price: number;
    status: string;
    ends_at: string;
  }>;
  atRiskStores: Array<{
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    is_verified: boolean;
    boost_expiry_date: string | null;
  }>;
  planDistribution: Array<{
    id: number;
    name: string;
    price: number;
    total_boosts: number;
    active_boosts: number;
  }>;
}
