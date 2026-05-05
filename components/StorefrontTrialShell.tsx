'use client';

import type { Store } from '@/types';
import { useAuth } from '@/src/context/AuthContext';
import PublicStorefrontAccessGate from '@/components/PublicStorefrontAccessGate';

/** Passes auth into {@link PublicStorefrontAccessGate} for server-rendered store routes. */
export default function StorefrontTrialShell({
  store,
  children,
}: {
  store: Store | null;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  return (
    <PublicStorefrontAccessGate store={store} user={user ?? null}>
      {children}
    </PublicStorefrontAccessGate>
  );
}
