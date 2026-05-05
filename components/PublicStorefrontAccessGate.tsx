'use client';

import type { Store as StoreType } from '@/types';
import type { ApiUser } from '@/src/lib/api';
import { StorefrontTrialLockProvider } from '@/components/StorefrontTrialLockContext';
import { isStoreTrialExpiredWithoutPaidPlan, viewerOwnsStore } from '@/src/lib/storeAccess';

type PublicStorefrontAccessGateProps = {
  store: StoreType | null;
  user?: ApiUser | null;
  children: React.ReactNode;
};

/**
 * Public storefront: always renders children at full clarity.
 * When the trial ended without a paid plan, visitors get {@link useStorefrontTrialLock} to show the
 * “store unavailable” modal only on purchase-related actions (cart / buy / pay).
 */
export default function PublicStorefrontAccessGate({ store, user, children }: PublicStorefrontAccessGateProps) {
  const isOwner = Boolean(store && viewerOwnsStore(store, user ?? null));
  const trialExpiredNoPlan = Boolean(store && isStoreTrialExpiredWithoutPaidPlan(store));
  const commerceLockActive = Boolean(trialExpiredNoPlan && !isOwner);

  return (
    <StorefrontTrialLockProvider store={store} commerceLockActive={commerceLockActive}>
      {children}
    </StorefrontTrialLockProvider>
  );
}
