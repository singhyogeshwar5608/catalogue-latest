export interface BackendBoostPlan {
  id: number;
  name: string;
  days: number;
  price: number;
  priority_weight: number;
  badge_label: string;
  badge_color: string;
  is_active: boolean;
  features?: string[];
}

export interface BackendStoreBoost {
  id: number;
  store_id: number;
  boost_plan_id: number;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'expired' | 'cancelled';
  activated_by?: number;
  plan: BackendBoostPlan;
  store?: any;
}

export interface BackendStore {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  /** Unique public path segment (`{name-slug}-{userId}`); `GET /store/{param}` matches slug or username. */
  username?: string | null;
  category_id?: number;
  category?: {
    id: number;
    name: string;
    slug?: string;
    business_type: 'product' | 'service' | 'hybrid';
    banner_image?: string | null;
    banner_images?: string[] | null;
    banner_title?: string | null;
    banner_subtitle?: string | null;
    banner_color?: string | null;
    color_combinations?: { color1: string; color2: string }[] | null;
    banner_pattern?: 'waves' | 'diagonal' | 'circles' | null;
  };
  logo?: string | null;
  banner?: string | null;
  phone?: string | null;
  email?: string | null;
  show_phone?: boolean | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
  address?: string | null;
  location?: string | null;
  state?: string | null;
  district?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distance_km?: number | string | null;
  description?: string | null;
  short_description?: string | null;
  rating?: string | number | null;
  total_reviews?: string | number | null;
  business_type?: string | null;
  layout_type?: 'layout1' | 'layout2' | null;
  theme?: string | null;
  boost_expiry_date?: string | null;
  is_verified: boolean;
  is_boosted?: boolean | null;
  is_active: boolean;
  /** Admin override: store has lifetime access (no expiry). */
  is_lifetime?: boolean | null;
  created_at?: string | null;
  trial_ends_at?: string | null;
  subscription_addons?: {
    payment_gateway?: boolean;
    qr_code?: boolean;
    payment_gateway_help?: boolean;
  } | null;
  products?: BackendProduct[];
  services?: BackendService[];
  active_boost?: BackendStoreBoost | null;
  active_subscription?: any | null;
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  /** Denormalized counts; maintained by follow/like toggles. */
  followers_count?: string | number | null;
  likes_count?: string | number | null;
  /** Present on `GET /store/:slug` when `guest_token` query or auth identifies the viewer. */
  viewer_following?: boolean | null;
  viewer_liked?: boolean | null;
  /** Counted storefront visits (each visitor contributes at most 10 to this total). */
  seen_count?: string | number | null;
}

export interface BackendProduct {
  id: number;
  store_id: number;
  title: string;
  price: string | number;
  original_price?: string | number | null;
  image?: string | null;
  images?: string[] | null;
  description?: string | null;
  category?: string | null;
  unit_type?: string | null;
  unit_custom_label?: string | null;
  unit_quantity?: string | number | null;
  wholesale_enabled?: boolean | null;
  wholesale_price?: string | number | null;
  wholesale_min_qty?: string | number | null;
  min_order_quantity?: string | number | null;
  discount_enabled?: boolean | null;
  discount_price?: string | number | null;
  discount_schedule_enabled?: boolean | null;
  discount_starts_at?: string | null;
  discount_ends_at?: string | null;
  rating?: string | number | null;
  total_reviews?: string | number | null;
  is_active: boolean;
  store?: BackendStore;
  /** Present on `GET /product/{id}` when the API includes public checkout hints. */
  checkout?: BackendProductCheckoutPayload | null;
}

export interface BackendProductCheckoutPayload {
  online_payment_available?: boolean;
  qr_payment_available?: boolean;
  payment_qr_url?: string | null;
}

export interface BackendService {
  id: number;
  store_id: number;
  title: string;
  price: string | number | null;
  image?: string | null;
  description?: string | null;
  billing_unit?: string | null;
  custom_billing_unit?: string | null;
  min_quantity?: string | number | null;
  package_price?: string | number | null;
  is_active: boolean;
  store?: BackendStore;
}

export interface BackendSearchResponse {
  query: string;
  location: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  types: ('stores' | 'products' | 'services')[];
  results: {
    stores: BackendStore[];
    products: BackendProduct[];
    services: BackendService[];
  };
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'super_admin';
  storeSlug?: string | null;
  stores?: StoreSummary[];
}

export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BackendReview {
  id: number;
  store_id?: number | null;
  product_id?: number | null;
  user_id?: number | null;
  user_name?: string | null;
  user_avatar?: string | null;
  rating?: number | string | null;
  comment?: string | null;
  reviewed_at?: string | null;
  seller_reply?: {
    message?: string | null;
    date?: string | null;
  } | null;
  is_approved?: boolean | null;
  user?: {
    id?: number | string | null;
    name?: string | null;
    avatar?: string | null;
  } | null;
}
