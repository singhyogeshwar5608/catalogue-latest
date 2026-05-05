import type { Store } from '@/types';
import { isPaidSubscriptionActive } from '@/src/lib/storeAccess';

/** True if the store has at least one subscription add-on enabled (after checkout intent). */
export function storeHasSubscriptionAddonAccess(store: Store | null | undefined): boolean {
  const a = store?.subscriptionAddons;
  if (!a) return false;
  return Boolean(a.paymentGateway || a.qrCode || a.paymentGatewayHelp);
}

/**
 * Payment integration (sidebar, mobile menu, `/dashboard/payment-integration`) — only for merchants
 * on an **active paid** subscription period who also opted into at least one paid add-on. Free-trial /
 * free-plan users do not see it until they complete a paid plan.
 */
export function storeCanAccessPaymentIntegrationHub(store: Store | null | undefined): boolean {
  if (!store) return false;
  if (!isPaidSubscriptionActive(store.activeSubscription ?? null)) return false;
  return storeHasSubscriptionAddonAccess(store);
}

/** Fired after subscription add-ons or profile fields change so dashboard chrome can refetch (pathname may not change). */
export const STORE_PROFILE_REFRESH_EVENT = 'catalog-store-profile-refresh';

export function dispatchStoreProfileRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORE_PROFILE_REFRESH_EVENT));
}
