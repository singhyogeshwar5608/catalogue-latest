import type { Store, StoreSubscription } from "@/types";
import { trialEndsAtFallbackFromCreated } from "@/src/lib/freeTrialDays";

/**
 * Paid plan period (unlocks storefront for visitors, catalog limits, no trial lock).
 * Uses plan/subscription price when present so paid tiers still count if slug is missing or wrong.
 */
export function isPaidSubscriptionActive(
  sub: StoreSubscription | null | undefined,
): boolean {
  if (!sub || sub.status !== "active") return false;
  const end = new Date(sub.endsAt).getTime();
  if (Number.isNaN(end) || end <= Date.now()) return false;
  const planPrice = Number(sub.plan?.price ?? 0);
  const subPrice = Number(sub.price ?? 0);
  if (planPrice > 0 || subPrice > 0) return true;
  const slug = (sub.plan?.slug ?? "").toLowerCase().trim();
  if (slug === "free" || slug === "") return false;
  return true;
}

function effectiveTrialEndMs(store: Store): number | null {
  const direct = store.trialEndsAt;
  if (direct) {
    const t = new Date(direct).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (store.createdAt) {
    const fb = trialEndsAtFallbackFromCreated(store.createdAt);
    if (fb) {
      const t = new Date(fb).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return null;
}

/**
 * Owner is in platform free-trial window: not on a paid plan, no lifetime access, and trial end is in the future.
 * Used to show dashboard trial reminder on every visit (not only in the last 7 days).
 */
export function isStoreInFreeTrialWindow(
  store: Store,
  subscription: StoreSubscription | null | undefined,
): boolean {
  if (isPaidSubscriptionActive(subscription)) {
    return false;
  }
  if (store.lifetimeAccess) {
    return false;
  }
  const trialEndMs = effectiveTrialEndMs(store);
  return trialEndMs !== null && trialEndMs > Date.now();
}

function ceilWholeDaysUntil(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Whole days left, floor — matches `TrialCountdownBanner` day tiles (not calendar ceil). */
function floorWholeDaysUntilMs(endMs: number, now = Date.now()): number {
  const diff = Math.max(0, endMs - now);
  const sec = Math.floor(diff / 1000);
  return Math.floor(sec / 86400);
}

/**
 * Days remaining for the owner-dashboard “subscription expiring” warning.
 * Uses paid period end when a paid plan is active; otherwise active trial end (same source as
 * `TrialCountdownBanner`); otherwise the subscription row `endsAt` (e.g. free plan period).
 */
export function getDashboardExpiryWarningDaysRemaining(
  store: Store,
  subscription: StoreSubscription | null | undefined,
): number | null {
  if (isPaidSubscriptionActive(subscription) && subscription?.endsAt) {
    return ceilWholeDaysUntil(subscription.endsAt);
  }
  const trialEndMs = effectiveTrialEndMs(store);
  if (trialEndMs !== null && trialEndMs > Date.now()) {
    return floorWholeDaysUntilMs(trialEndMs);
  }
  if (subscription?.endsAt) {
    return ceilWholeDaysUntil(subscription.endsAt);
  }
  return null;
}

/**
 * True when store's trial has ended and there is no currently active paid subscription or lifetime access.
 * Visitors can still browse storefront; commerce actions use `useStorefrontTrialLock` to show
 * contact-owner modal. The logged-in owner bypasses that gate. Dashboard catalog uploads stay blocked in UI + API.
 */
export function isStoreTrialExpiredWithoutPaidPlan(
  store: Store | null | undefined,
): boolean {
  if (!store) return false;
  if (isPaidSubscriptionActive(store.activeSubscription)) return false;
  if (store.lifetimeAccess) return false;
  const trialEnd = effectiveTrialEndMs(store);
  if (trialEnd === null) return false;
  return trialEnd <= Date.now();
}

export function viewerOwnsStore(
  store: Store,
  user:
    | { storeSlug: string | null; stores?: { slug?: string }[] }
    | null
    | undefined,
): boolean {
  if (!user || !store.username) return false;
  const path = store.username.toLowerCase();
  if (user.storeSlug?.toLowerCase() === path) return true;
  return Boolean(
    user.stores?.some((s) => (s.slug ?? "").toLowerCase() === path),
  );
}
