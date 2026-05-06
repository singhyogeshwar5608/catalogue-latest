"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  BarChart3,
  Briefcase,
  CreditCard,
  Crown,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  Home,
  MapPin,
  Phone,
  Package,
  Plus,
  QrCode,
  Star,
  Store as StoreIcon,
  Users,
  UserPlus,
  Heart,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  getApiRequestBaseUrl,
  getProductsByStore,
  getMyStores,
  getStoreBySlugFromApi,
  getStoreSubscription,
  isApiError,
  updateStore,
} from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { perfLog } from "@/src/lib/perfLog";
import {
  getDashboardExpiryWarningDaysRemaining,
  isPaidSubscriptionActive,
  isStoreInFreeTrialWindow,
} from "@/src/lib/storeAccess";
import {
  SOCIAL_BRAND_ICON_DASHBOARD_PX,
  SOCIAL_BRAND_ICON_URL_BY_PLATFORM,
} from "@/src/lib/socialBrandAssets";
import { STORE_PROFILE_REFRESH_EVENT } from "@/src/lib/storeSubscriptionAddons";
import type {
  Product,
  Store,
  StoreSubscription,
  SubscriptionPlan,
} from "@/types";
import SubscriptionExpiryPopup from "@/components/SubscriptionExpiryPopup";
import ProductLimitPopup from "@/components/ProductLimitPopup";
import BoostExpiryPopup from "@/components/BoostExpiryPopup";

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

type DashboardStatVariant =
  | "violet"
  | "sky"
  | "amber"
  | "indigo"
  | "rose"
  | "teal";

type DashboardStatItem = {
  label: string;
  value: string;
  icon: LucideIcon;
  variant: DashboardStatVariant;
};

const DASHBOARD_STAT_STYLES: Record<
  DashboardStatVariant,
  { card: string; iconWrap: string; label: string }
> = {
  violet: {
    card: "border-violet-200/90 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40",
    iconWrap:
      "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25",
    label: "text-violet-800/80",
  },
  sky: {
    card: "border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-white to-blue-50/40",
    iconWrap:
      "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25",
    label: "text-sky-800/80",
  },
  amber: {
    card: "border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40",
    iconWrap:
      "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25",
    label: "text-amber-900/70",
  },
  indigo: {
    card: "border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/40",
    iconWrap:
      "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25",
    label: "text-indigo-800/80",
  },
  rose: {
    card: "border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-white to-pink-50/40",
    iconWrap:
      "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25",
    label: "text-rose-800/80",
  },
  teal: {
    card: "border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/40",
    iconWrap:
      "bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25",
    label: "text-teal-800/80",
  },
};

function DashboardStatCard({ item }: { item: DashboardStatItem }) {
  const s = DASHBOARD_STAT_STYLES[item.variant];
  const Icon = item.icon;
  return (
    <div
      className={`dashboard-stat-card rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-5 ${s.card}`}
    >
      <div
        className={`dashboard-stat-icon mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${s.iconWrap}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <p
        className={`dashboard-stat-label text-[11px] font-bold uppercase tracking-[0.14em] ${s.label}`}
      >
        {item.label}
      </p>
      <p className="dashboard-stat-value mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
        {item.value}
      </p>
    </div>
  );
}

/** Billing length from catalog plan (duration_days or billing_cycle). */
function describePlanBillingDuration(plan: SubscriptionPlan): string {
  const d = plan.durationDays;
  if (d && d > 0) {
    if (d % 365 === 0) return d === 365 ? "1 year" : `${d / 365} years`;
    if (d % 30 === 0) return d === 30 ? "1 month" : `${d / 30} months`;
    if (d === 7) return "1 week";
    return `${d} days`;
  }
  return plan.billingCycle === "yearly" ? "Yearly" : "Monthly";
}

function subscriptionPeriodEndLabel(endsAt: string): string {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return "";
  return end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Active subscription row: API plan name + duration + current period end. */
function formatActiveSubscriptionPlanLine(sub: StoreSubscription): string {
  const name = (sub.plan.name ?? sub.plan.slug ?? "").trim() || "Subscription";
  const end = subscriptionPeriodEndLabel(sub.endsAt);
  const left = daysUntil(sub.endsAt);
  const suffix =
    left != null && left >= 0 && sub.status === "active"
      ? ` · ${left} day${left === 1 ? "" : "s"} left`
      : "";
  return end ? `${name} · until ${end}${suffix}` : `${name}${suffix}`;
}

/** True only for a paid plan period — not the platform default `free` slug row from signup. */
export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, user, setUser } = useAuth();
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(
    null,
  );
  const [showSubscriptionExpiry, setShowSubscriptionExpiry] = useState(false);
  const [showProductLimit, setShowProductLimit] = useState(false);
  const [showBoostExpiry, setShowBoostExpiry] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    facebook: "",
    instagram: "",
    youtube: "",
    linkedin: "",
  });
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [socialLinksMessage, setSocialLinksMessage] = useState<string | null>(
    null,
  );
  const [openSocialPlatform, setOpenSocialPlatform] = useState<
    keyof typeof socialLinks | null
  >(null);
  const socialInputRefs = useRef<
    Partial<Record<keyof typeof socialLinks, HTMLInputElement | null>>
  >({});
  const [showPhone, setShowPhone] = useState(true);
  const [savingPhoneVisibility, setSavingPhoneVisibility] = useState(false);

  const hasProducts = myProducts.length > 0;

  /** Public URL for this store’s page — same as “View Store”, never hardcoded to another domain. */
  const storeUrl = useMemo(() => {
    if (!myStore?.username) return "";
    const path = `/store/${encodeURIComponent(myStore.username)}`;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    const base = (
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://larawans.com"
    )
      .trim()
      .replace(/\/+$/, "");
    return `${base}${path}`;
  }, [myStore?.username]);

  const prettyUrl = useMemo(
    () => storeUrl.replace(/^https?:\/\//, ""),
    [storeUrl],
  );

  /**
   * Use `/my/stores` as source of truth — not `user.storeSlug` from localStorage (stale slugs
   * cause 404 "Store not found" after username changes, Redis/Next is unrelated for this path).
   */
  const dashboardSwrKey =
    isLoggedIn && user?.id ? (["dashboard", user.id] as const) : null;

  const {
    data: dashboardData,
    error: swrError,
    isLoading: swrLoading,
    mutate: mutateDashboard,
  } = useSWR(
    dashboardSwrKey,
    async () => {
      perfLog("dashboard", "SWR fetch start");
      let stores: Store[] = [];
      let myStoresError: unknown;
      try {
        stores = await getMyStores();
      } catch (e) {
        myStoresError = e;
      }
      if (stores.length === 0 && user?.storeSlug?.trim()) {
        try {
          const one = await getStoreBySlugFromApi(user.storeSlug.trim());
          stores = [one];
          perfLog(
            "dashboard",
            "Loaded store via GET /store/:slug fallback (my/stores failed or empty)",
          );
        } catch (fallbackErr) {
          if (myStoresError) {
            throw myStoresError;
          }
          throw fallbackErr;
        }
      }
      if (!stores.length) {
        if (myStoresError) {
          throw myStoresError;
        }
        throw new Error("You need to create a store first.");
      }
      const prefer = user?.storeSlug?.trim();
      let store: Store;
      if (prefer) {
        const byUsername = stores.find((s) => s.username === prefer);
        const byId = stores.find((s) => String(s.id) === prefer);
        store = byUsername ?? byId ?? stores[0];
      } else {
        store = stores[0];
      }
      // Subscription/products endpoints can 500 on production (DB, Redis) while `/my/stores` works.
      // Do not block the whole dashboard — show store shell and empty subscription if needed.
      const [prodResult, subResult] = await Promise.allSettled([
        getProductsByStore(store.id),
        getStoreSubscription(store.id),
      ]);
      const products =
        prodResult.status === "fulfilled" ? (prodResult.value ?? []) : [];
      if (prodResult.status === "rejected") {
        perfLog(
          "dashboard",
          `products load failed: ${String(prodResult.reason)}`,
        );
      }
      const apiSub =
        subResult.status === "fulfilled"
          ? subResult.value.activeSubscription
          : null;
      if (subResult.status === "rejected") {
        perfLog(
          "dashboard",
          `subscription load failed: ${String(subResult.reason)}`,
        );
      }
      const activeSubscription = apiSub ?? store.activeSubscription ?? null;
      perfLog("dashboard", "SWR data ready");
      return { store, products, activeSubscription };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      /** Keep storefront view counts in sync (owner dashboard vs public page visitors). */
      refreshInterval: 20_000,
      dedupingInterval: 5000,
    },
  );

  // useLayoutEffect: sync SWR → state before first paint (avoids "Store not found" + missed modal
  // when client-navigating from /dashboard/* with cached SWR while React state is still initial).
  useLayoutEffect(() => {
    if (!dashboardData) {
      return;
    }
    const { store, products, activeSubscription } = dashboardData;
    setMyStore(store);
    setMyProducts(products);
    setSubscription(activeSubscription);
    setShowSubscriptionExpiry(false);
    setShowProductLimit(false);
    setShowBoostExpiry(false);
    const subForWarning =
      activeSubscription ?? store.activeSubscription ?? null;
    const remainingDays = getDashboardExpiryWarningDaysRemaining(
      store,
      subForWarning,
    );
    if (store.lifetimeAccess) {
      setShowSubscriptionExpiry(false);
    } else if (isStoreInFreeTrialWindow(store, subForWarning)) {
      setShowSubscriptionExpiry(true);
    } else if (remainingDays != null && remainingDays <= 7) {
      setShowSubscriptionExpiry(true);
    }
    if (
      subForWarning &&
      products &&
      products.length >= subForWarning.plan.maxProducts
    ) {
      setShowProductLimit(true);
    }
    if (store.activeBoost) {
      const boostEndsAt = new Date(store.activeBoost.endsAt);
      const boostRemaining = Math.ceil(
        (boostEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (store.activeBoost.status === "expired" || boostRemaining <= 3) {
        setShowBoostExpiry(true);
      }
    }
  }, [dashboardData]);

  /** Fix stale `storeSlug` in localStorage after `/my/stores` returns the real username. */
  useEffect(() => {
    if (!dashboardData?.store || !user) return;
    const u = dashboardData.store.username?.trim();
    if (u && user.storeSlug !== u) {
      setUser({ ...user, storeSlug: u });
    }
  }, [dashboardData?.store, user, setUser]);

  useEffect(() => {
    const onStoreProfileChanged = () => {
      void mutateDashboard();
    };
    if (typeof window === "undefined") return;
    window.addEventListener(STORE_PROFILE_REFRESH_EVENT, onStoreProfileChanged);
    return () =>
      window.removeEventListener(
        STORE_PROFILE_REFRESH_EVENT,
        onStoreProfileChanged,
      );
  }, [mutateDashboard]);

  useEffect(() => {
    if (!swrError) return;
    if (isApiError(swrError) && swrError.status === 401) {
      router.replace("/auth?redirect=/dashboard");
      return;
    }
    let msg =
      swrError instanceof Error
        ? swrError.message
        : "Unable to load store data";
    if (
      /^Server Error$/i.test(msg.trim()) ||
      /Internal Server Error/i.test(msg)
    ) {
      msg =
        "Could not load your store (API error). If this continues, run migrations and check the Laravel log on the API server.";
    }
    setError(msg);
  }, [swrError, router]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [isLoggedIn, router]);

  const loading =
    isLoggedIn &&
    Boolean(user?.id) &&
    swrLoading &&
    !dashboardData &&
    !swrError;

  useEffect(() => {
    try {
      router.prefetch("/dashboard/subscription");
      router.prefetch("/dashboard/notifications");
      router.prefetch("/dashboard/products");
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    if (!myStore) return;
    setShowPhone(myStore.showPhone !== false);
    setSocialLinks({
      facebook: myStore.socialLinks?.facebook ?? "",
      instagram: myStore.socialLinks?.instagram ?? "",
      youtube: myStore.socialLinks?.youtube ?? "",
      linkedin: myStore.socialLinks?.linkedin ?? "",
    });
  }, [myStore]);

  useEffect(() => {
    if (!showQRModal || !canvasRef.current) return;

    let isMounted = true;
    (async () => {
      const QRCode = await import("qrcode");
      if (!isMounted || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, storeUrl, {
        width: 220,
        margin: 2,
        color: {
          dark: "#111827",
          light: "#ffffff",
        },
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [showQRModal, storeUrl]);

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "store-qr-code.png";
    link.href = url;
    link.click();
  };

  const hasActivePaidSubscription = useMemo(
    () => isPaidSubscriptionActive(subscription),
    [subscription],
  );

  const trialStillActive = useMemo(() => {
    if (!myStore?.trialEndsAt) return false;
    const end = new Date(myStore.trialEndsAt).getTime();
    return !Number.isNaN(end) && end > Date.now();
  }, [myStore?.trialEndsAt]);

  const trialDurationDaysLabel = useMemo(() => {
    if (!myStore?.trialEndsAt || !myStore?.createdAt) return null;
    const ms =
      new Date(myStore.trialEndsAt).getTime() -
      new Date(myStore.createdAt).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const days = Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
    return `${days} day${days === 1 ? "" : "s"}`;
  }, [myStore?.trialEndsAt, myStore?.createdAt]);

  const planSummaryText = useMemo(() => {
    if (!myStore) return "—";

    // Check for lifetime access first
    if (myStore.lifetimeAccess) {
      return "Lifetime Free Access · Unlimited access granted by admin";
    }

    const activeSub = subscription ?? myStore.activeSubscription ?? null;
    const endsMs = activeSub ? new Date(activeSub.endsAt).getTime() : NaN;
    const periodStillOpen =
      activeSub &&
      activeSub.status === "active" &&
      !Number.isNaN(endsMs) &&
      endsMs > Date.now();

    if (periodStillOpen && activeSub) {
      return formatActiveSubscriptionPlanLine(activeSub);
    }

    if (trialStillActive) {
      const trialEnd = myStore.trialEndsAt
        ? subscriptionPeriodEndLabel(myStore.trialEndsAt)
        : "";
      const trialLeft = daysUntil(myStore.trialEndsAt);
      const trialSuffix =
        trialLeft != null && trialLeft >= 0
          ? ` · ${trialLeft} day${trialLeft === 1 ? "" : "s"} left`
          : "";
      const base = trialDurationDaysLabel
        ? `Free trial (${trialDurationDaysLabel})`
        : "Free trial";
      return trialEnd
        ? `${base} · ends ${trialEnd}${trialSuffix}`
        : `${base}${trialSuffix}`;
    }

    if (activeSub) {
      const name =
        (activeSub.plan.name ?? activeSub.plan.slug ?? "").trim() ||
        "Subscription";
      const ended = !Number.isNaN(endsMs) && endsMs <= Date.now();
      if (
        ended ||
        activeSub.status === "expired" ||
        activeSub.status === "cancelled"
      ) {
        const status =
          activeSub.status === "expired" || activeSub.status === "cancelled"
            ? activeSub.status
            : "period ended";
        const lastEnd = subscriptionPeriodEndLabel(activeSub.endsAt);
        return lastEnd
          ? `${name} — ${status} · was until ${lastEnd}`
          : `${name} — ${status}`;
      }
      return formatActiveSubscriptionPlanLine(activeSub);
    }

    return "—";
  }, [myStore, subscription, trialDurationDaysLabel, trialStillActive]);

  /** Auth user email; fall back to store.owner from API when session shape omits email (desktop hydration). */
  const displayRegisteredEmail = useMemo(() => {
    const a = user?.email?.trim();
    if (a) return a;
    const b = myStore?.user?.email?.trim();
    if (b) return b;
    return myStore?.email?.trim() ?? "";
  }, [user?.email, myStore?.user?.email, myStore?.email]);

  const catalogDashboardStats = useMemo((): DashboardStatItem[] => {
    if (!myStore) return [];
    const productLabel =
      myStore.businessType === "service"
        ? "Services"
        : myStore.businessType === "hybrid"
          ? "Listings"
          : "Products";
    const ProductIcon =
      myStore.businessType === "service" ? Briefcase : Package;
    return [
      {
        label: productLabel,
        value: String(myProducts.length),
        icon: ProductIcon,
        variant: "violet",
      },
      {
        label: "Reviews",
        value: String(myStore.totalReviews),
        icon: Users,
        variant: "sky",
      },
      {
        label: "Rating",
        value: `${myStore.rating}/5`,
        icon: Star,
        variant: "amber",
      },
    ];
  }, [myProducts.length, myStore]);

  const audienceDashboardStats = useMemo((): DashboardStatItem[] => {
    if (!myStore) return [];
    return [
      {
        label: "Followers",
        value: String(myStore.followersCount ?? 0),
        icon: UserPlus,
        variant: "indigo",
      },
      {
        label: "Likes",
        value: String(myStore.likesCount ?? 0),
        icon: Heart,
        variant: "rose",
      },
      {
        label: "Seen",
        value: String(myStore.seenCount ?? 0),
        icon: Eye,
        variant: "teal",
      },
    ];
  }, [myStore]);

  const socialPlatforms = [
    {
      key: "facebook",
      label: "Facebook",
      placeholder: "Paste full Facebook link here",
    },
    {
      key: "instagram",
      label: "Instagram",
      placeholder: "Paste full Instagram link here",
    },
    {
      key: "youtube",
      label: "YouTube",
      placeholder: "Paste full YouTube link here",
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      placeholder: "Paste full LinkedIn link here",
    },
  ] as const;

  const handleSocialLinkChange = (
    key: keyof typeof socialLinks,
    value: string,
  ) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!openSocialPlatform) return;
    const focusTimer = window.requestAnimationFrame(() => {
      socialInputRefs.current[openSocialPlatform]?.focus();
    });
    return () => window.cancelAnimationFrame(focusTimer);
  }, [openSocialPlatform]);

  const handleSaveSocialLinks = async () => {
    if (!myStore || savingSocialLinks) return;

    setSavingSocialLinks(true);
    setSocialLinksMessage(null);
    try {
      const trimmed = {
        facebook: socialLinks.facebook.trim(),
        instagram: socialLinks.instagram.trim(),
        youtube: socialLinks.youtube.trim(),
        linkedin: socialLinks.linkedin.trim(),
      };
      const { store } = await updateStore({
        id: myStore.id,
        facebook_url: trimmed.facebook || null,
        instagram_url: trimmed.instagram || null,
        youtube_url: trimmed.youtube || null,
        linkedin_url: trimmed.linkedin || null,
      });
      setMyStore(store);
      void mutateDashboard();
      setSocialLinks({
        facebook: store.socialLinks?.facebook?.trim() || trimmed.facebook,
        instagram: store.socialLinks?.instagram?.trim() || trimmed.instagram,
        youtube: store.socialLinks?.youtube?.trim() || trimmed.youtube,
        linkedin: store.socialLinks?.linkedin?.trim() || trimmed.linkedin,
      });
      setSocialLinksMessage("Social links saved");
    } catch (err) {
      setSocialLinksMessage(
        isApiError(err) ? err.message : "Unable to save social links",
      );
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const handlePhoneVisibilityToggle = async () => {
    if (!myStore || savingPhoneVisibility) return;

    const nextValue = !showPhone;
    setShowPhone(nextValue);
    setSavingPhoneVisibility(true);
    try {
      const { store } = await updateStore({
        id: myStore.id,
        show_phone: nextValue,
      });
      setMyStore(store);
      void mutateDashboard();
    } catch (err) {
      setShowPhone(!nextValue);
    } finally {
      setSavingPhoneVisibility(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
          <p className="mt-4 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !myStore) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error || "Store not found. Please create a store first."}
      </div>
    );
  }

  const subscriptionExpiryPopupDaysRemaining =
    getDashboardExpiryWarningDaysRemaining(myStore, subscription);
  const boostDaysRemaining = daysUntil(myStore?.activeBoost?.endsAt);
  const isLifetimeAccess = Boolean(myStore.lifetimeAccess);

  return (
    <div className="dashboard-mobile mx-auto min-w-0 max-w-6xl space-y-4 sm:space-y-6">
      <div
        className={
          isLifetimeAccess
            ? "rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 text-slate-900 shadow-md sm:px-6 max-md:rounded-[14px] max-md:px-[14px] max-md:py-[10px]"
            : "rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white shadow-lg sm:px-6 max-md:rounded-[14px] max-md:border-transparent max-md:bg-[#0f2027] max-md:px-[14px] max-md:py-[10px]"
        }
      >
        <div className="hidden items-center justify-between gap-2 max-md:flex">
          <span
            className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] ${isLifetimeAccess ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm" : "bg-[#162530]"}`}
          >
            {isLifetimeAccess ? (
              <Crown className="h-4 w-4 text-white" aria-hidden />
            ) : (
              <CreditCard className="h-4 w-4 text-[#2dd4bf]" aria-hidden />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={`truncate text-[12px] font-bold leading-none ${isLifetimeAccess ? "text-slate-900" : "text-white"}`}
              >
                {planSummaryText}
              </p>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none ${isLifetimeAccess ? "bg-amber-600 text-white" : "bg-[#2dd4bf]/20 text-[#2dd4bf]"}`}
              >
                Active
              </span>
            </div>
            <p
              className={`mt-1 truncate text-[9px] font-bold leading-none ${isLifetimeAccess ? "text-slate-600" : "text-white"}`}
            >
              {planSummaryText}
            </p>
            <div
              className={`mt-1.5 h-[3px] w-full max-w-[120px] overflow-hidden rounded-full ${isLifetimeAccess ? "bg-amber-200/90" : "bg-white/20"}`}
            >
              <span
                className={`block h-full w-[14%] rounded-full ${isLifetimeAccess ? "bg-amber-600" : "bg-[#2dd4bf]"}`}
              />
            </div>
          </div>

          <Link
            href="/dashboard/subscription"
            prefetch
            className={`shrink-0 rounded-[8px] px-3 py-1.5 text-[10px] font-semibold leading-none ${isLifetimeAccess ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-[#2dd4bf] text-[#0f2027]"}`}
          >
            Upgrade
          </Link>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-md:hidden">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${isLifetimeAccess ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm ring-orange-600/25" : "bg-white/10 ring-white/10"}`}
            >
              {isLifetimeAccess ? (
                <Crown className="h-5 w-5 text-white" aria-hidden />
              ) : (
                <CreditCard className="h-5 w-5 text-amber-200" aria-hidden />
              )}
            </span>
            <div>
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isLifetimeAccess ? "text-amber-900/70" : "text-white/55"}`}
              >
                Current plan
              </p>
              <p
                className={`mt-0.5 text-base font-bold leading-snug sm:text-lg ${isLifetimeAccess ? "text-slate-900" : "text-white"}`}
              >
                {planSummaryText}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="audience-card w-full max-w-[380px] rounded-[14px] border-[0.5px] border-[#e4e9f0] bg-white px-[12px] py-[4px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="audience-inline-grid flex items-center justify-between">
          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <UserPlus
                className="h-[14.4px] w-[14.4px] text-[#0D3AD1]"
                strokeWidth={2}
              />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.followersCount ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <p className="text-[8px] font-extrabold leading-none tracking-[0.03em] text-[#0D3AD1]">
              Followers
            </p>
          </div>

          <div className="h-4 w-[0.5px] bg-[#e4e9f0]" />

          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <Heart
                className="h-[14.4px] w-[14.4px] text-[#D10DB4]"
                strokeWidth={2}
              />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.likesCount ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <p className="text-[8px] font-extrabold leading-none tracking-[0.03em] text-[#D10DB4]">
              Likes
            </p>
          </div>

          <div className="h-4 w-[0.5px] bg-[#e4e9f0]" />

          <div className="flex flex-1 flex-col items-center gap-[1px]">
            <div className="flex items-center gap-[5px]">
              <Eye
                className="h-[14.4px] w-[14.4px] text-[#070A07]"
                strokeWidth={2}
              />
              <p className="text-[13px] font-medium leading-none text-[#111827] tabular-nums">
                {(myStore.seenCount ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
            <p className="text-[8px] font-extrabold leading-none tracking-[0.03em] text-[#070A07]">
              Views
            </p>
          </div>
        </div>
      </div>

      <section className="dashboard-hero-card relative overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 shadow-sm sm:rounded-[28px] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {(myStore.seenCount ?? 0).toLocaleString("en-IN")} total
                storefront views
              </span>
              <div>
                <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {myStore.name}
                </h1>
                {myStore.id ? (
                  <p
                    className="mt-1 text-[8px] font-semibold tabular-nums leading-snug text-slate-600 sm:text-[10px]"
                    aria-label={`Store ID ${myStore.id}`}
                  >
                    Store ID: {myStore.id}
                  </p>
                ) : null}
                {displayRegisteredEmail ? (
                  <p
                    className="mt-1 break-all text-xs font-semibold leading-snug text-slate-600 sm:text-sm"
                    aria-label={`Registered email ${displayRegisteredEmail}`}
                  >
                    Registered email: {displayRegisteredEmail}
                  </p>
                ) : null}
                {myStore.location ? (
                  <p className="mt-1 text-sm text-slate-500">
                    {myStore.location}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    Add your store location so visitors know where to find you.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                <span
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 shadow-sm"
                  aria-hidden
                />
                {myStore.logo ? (
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={myStore.logo}
                      alt={myStore.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-slate-900/5 text-slate-700 shadow-md">
                    <StoreIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="-mt-1 flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white/90 px-0.5 py-0.5 text-sm shadow-sm">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Phone className="h-4 w-4 text-slate-400" />
              {myStore.phone ? myStore.phone : "No phone added"}
            </span>
            <button
              type="button"
              onClick={handlePhoneVisibilityToggle}
              disabled={savingPhoneVisibility}
              className={`relative ml-auto inline-flex h-6 w-10 shrink-0 rounded-full transition ${showPhone ? "bg-emerald-500" : "bg-slate-300"} disabled:cursor-not-allowed disabled:opacity-60`}
              aria-pressed={showPhone}
              aria-label="Toggle phone visibility"
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${showPhone ? "left-5" : "left-1"}`}
              />
            </button>
          </div>

          <div className="dashboard-quick-links flex flex-wrap gap-2 sm:gap-3 max-md:grid max-md:grid-cols-3 max-md:gap-1">
            <Link
              href="/"
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full border border-indigo-700 bg-indigo-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-indigo-700 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              <Home className="h-4 w-4 max-md:h-3 max-md:w-3" />
              Home Page
            </Link>
            <Link
              href={`/store/${myStore.username}`}
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-800 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              View Store
              <ExternalLink className="h-4 w-4 max-md:h-3 max-md:w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              className="dashboard-quick-link inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700 sm:px-5 sm:py-2.5 sm:text-sm max-md:w-full max-md:min-w-0 max-md:gap-1 max-md:rounded-xl max-md:px-2 max-md:py-1.5 max-md:text-[10px] max-md:leading-none max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis"
            >
              <QrCode className="h-4 w-4 max-md:h-3 max-md:w-3" />
              QR Code
            </button>
          </div>

          <div className="dashboard-primary-cta-row flex flex-col gap-2 sm:hidden">
            {(myStore.businessType === "product" ||
              myStore.businessType === "hybrid") && (
              <div className="dashboard-product-actions flex w-full min-w-0 justify-center gap-2">
                <Link
                  href="/dashboard/products"
                  className="dashboard-primary-cta inline-flex min-w-0 items-center justify-center gap-1 rounded-full bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Add Product</span>
                </Link>
                <Link
                  href="/dashboard/products"
                  className="dashboard-view-products-cta inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-primary bg-white px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary/10"
                >
                  <Package className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">View Products</span>
                </Link>
              </div>
            )}
            {(myStore.businessType === "service" ||
              myStore.businessType === "hybrid") && (
              <Link
                href="/dashboard/products?tab=services"
                className="dashboard-secondary-cta inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Briefcase className="h-4 w-4" />
                Add Service
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="activity-card overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[26px]">
          <div className="activity-card-header border-b border-slate-100 bg-gradient-to-r from-violet-50/50 via-white to-sky-50/40 px-5 py-4 sm:px-6">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-3.5 w-3.5 text-violet-600" aria-hidden />
              Store activity
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Catalog & reviews
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Listings, reviews, and how buyers rate your store.
            </p>
          </div>
          <div className="activity-grid grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
            {catalogDashboardStats.map((item) => (
              <DashboardStatCard key={item.label} item={item} />
            ))}
          </div>
        </div>

        <div
          className="social-links-card w-full rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
          style={{ borderWidth: "0.5px", borderColor: "#e8e8e8" }}
        >
          <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Social Media Links
          </h2>
          <div className="mt-0 grid gap-2.5">
            {socialPlatforms.map((platform) => {
              const isOpen = openSocialPlatform === platform.key;
              return (
                <div
                  key={platform.key}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSocialPlatform((prev) =>
                        prev === platform.key ? null : platform.key,
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`social-panel-${platform.key}`}
                  >
                    <span className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <img
                        src={SOCIAL_BRAND_ICON_URL_BY_PLATFORM[platform.key]}
                        alt=""
                        width={SOCIAL_BRAND_ICON_DASHBOARD_PX}
                        height={SOCIAL_BRAND_ICON_DASHBOARD_PX}
                        className="shrink-0 object-contain"
                        style={{
                          width: SOCIAL_BRAND_ICON_DASHBOARD_PX,
                          height: SOCIAL_BRAND_ICON_DASHBOARD_PX,
                        }}
                        aria-hidden
                      />
                      {platform.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`social-panel-${platform.key}`}
                      className="border-t border-slate-100 px-3.5 pb-3.5 pt-3"
                    >
                      <input
                        ref={(node) => {
                          socialInputRefs.current[platform.key] = node;
                        }}
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        value={socialLinks[platform.key]}
                        onChange={(event) =>
                          handleSocialLinkChange(
                            platform.key,
                            event.target.value,
                          )
                        }
                        placeholder={platform.placeholder}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {socialLinksMessage ? (
              <p
                className={`text-sm ${socialLinksMessage === "Social links saved" ? "text-emerald-600" : "text-slate-500"}`}
              >
                {socialLinksMessage}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSaveSocialLinks}
              disabled={savingSocialLinks}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition duration-[800ms] active:opacity-80 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#1a1a2e" }}
            >
              {savingSocialLinks ? "Saving…" : "Save social links"}
            </button>
          </div>
        </div>
      </section>

      <section className="dashboard-lower-grid grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="dashboard-lower-stack space-y-4"></div>
      </section>

      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 py-3 sm:items-center">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-[0_20px_45px_rgba(15,23,42,0.22)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                  QR Code
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Store QR
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowQRModal(false)}
                className="text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-3">
                <canvas ref={canvasRef} className="h-36 w-36 sm:h-44 sm:w-44" />
              </div>
              <div className="w-full rounded-2xl bg-slate-950 px-3 py-3 text-center text-[11px] font-mono tracking-wide text-white break-all">
                {prettyUrl}
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubscriptionExpiry && (
        <SubscriptionExpiryPopup
          planName={
            subscription?.plan?.name?.trim() ||
            (trialStillActive ? "Free trial" : "Your plan")
          }
          daysRemaining={subscriptionExpiryPopupDaysRemaining ?? 0}
          onClose={() => setShowSubscriptionExpiry(false)}
        />
      )}

      {showProductLimit && subscription && (
        <ProductLimitPopup
          currentProducts={myProducts.length}
          maxProducts={subscription.plan.maxProducts}
          planName={subscription.plan.name}
          onClose={() => setShowProductLimit(false)}
        />
      )}

      {showBoostExpiry && myStore?.activeBoost && (
        <BoostExpiryPopup
          boostPlanName={myStore.activeBoost.plan.name}
          isExpired={myStore.activeBoost.status === "expired"}
          daysRemaining={
            myStore.activeBoost.status === "expired"
              ? undefined
              : (boostDaysRemaining ?? undefined)
          }
          onClose={() => setShowBoostExpiry(false)}
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .dashboard-mobile {
            gap: 0.75rem;
          }

          .dashboard-hero-card {
            padding: 0.75rem;
          }

          .dashboard-hero-card h1 {
            font-size: 1.2rem;
          }

          .dashboard-hero-card p {
            font-size: 0.8rem;
          }

          .dashboard-primary-cta-row {
            margin-top: 0.25rem;
          }

          .dashboard-quick-links {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.4rem;
          }

          .dashboard-quick-link {
            width: 100%;
            min-width: 0;
            padding: 0.3rem 0.2rem;
            font-size: 0.58rem;
            gap: 0.15rem;
            border-radius: 0.8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.1;
          }

          .dashboard-quick-link :global(svg) {
            height: 0.68rem;
            width: 0.68rem;
            flex-shrink: 0;
          }

          .dashboard-product-actions .dashboard-primary-cta,
          .dashboard-product-actions .dashboard-view-products-cta {
            flex: 0 1 auto;
            min-width: 7.25rem;
            min-height: 1.9rem;
          }

          .dashboard-primary-cta-row > .dashboard-primary-cta {
            flex: 1 1 100%;
            min-height: 2.5rem;
          }

          .dashboard-secondary-cta {
            min-height: 2.5rem;
          }

          .audience-card,
          .activity-card {
            border-radius: 1rem;
          }

          .audience-card > div:first-child,
          .activity-card > div:first-child {
            padding: 0.75rem 0.875rem;
          }

          .activity-card-header {
            display: none;
          }

          .audience-card-heading {
            display: none;
          }

          .audience-card h2,
          .activity-card h2 {
            font-size: 1rem;
          }

          .audience-card p,
          .activity-card p {
            font-size: 0.75rem;
          }

          .audience-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.35rem;
            padding: 0.45rem;
          }

          .activity-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.3rem;
            padding: 0.4rem;
          }

          .activity-grid :global(.dashboard-stat-card) {
            padding: 0.25rem 0.2rem;
            border-radius: 0.65rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 0;
          }

          .activity-grid :global(.dashboard-stat-icon) {
            height: 1rem;
            width: 1rem;
            margin-bottom: 0.1rem;
          }

          .activity-grid :global(.dashboard-stat-label) {
            font-size: 0.5rem;
            letter-spacing: 0.05em;
            line-height: 1.1;
          }

          .activity-grid :global(.dashboard-stat-value) {
            font-size: 0.86rem;
            margin-top: 0.05rem;
            line-height: 1.1;
          }

          .dashboard-stat-card {
            padding: 0.35rem;
            border-radius: 0.7rem;
            box-shadow: none;
            min-height: auto;
          }

          .dashboard-stat-icon {
            height: 1.3rem;
            width: 1.3rem;
            margin-bottom: 0.2rem;
            border-radius: 0.45rem;
          }

          .dashboard-stat-label {
            font-size: 0.46rem;
            letter-spacing: 0.07em;
          }

          .dashboard-stat-value {
            margin-top: 0.1rem;
            font-size: 0.7rem;
            line-height: 1.2;
          }

          .dashboard-lower-grid {
            margin-top: 0.25rem;
          }

          .dashboard-lower-stack {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
          }

          .social-links-card,
          .empty-state-card {
            padding: 0.875rem;
            border-radius: 1rem;
          }

          .empty-state-card {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
