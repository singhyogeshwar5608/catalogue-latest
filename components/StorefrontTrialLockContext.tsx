'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Store } from '@/types';
import StoreVisitorTrialLockModal from '@/components/StoreVisitorTrialLockModal';

export type StorefrontTrialLockContextValue = {
  /** Opens the visitor trial-expired modal when commerce gating is active. */
  openVisitorTrialLock: () => void;
};

const StorefrontTrialLockContext = createContext<StorefrontTrialLockContextValue | null>(null);

export function useStorefrontTrialLock(): StorefrontTrialLockContextValue | null {
  return useContext(StorefrontTrialLockContext);
}

type StorefrontTrialLockProviderProps = {
  store: Store | null;
  /** When false, `openVisitorTrialLock` is a no-op (e.g. owner preview or active paid plan). */
  commerceLockActive: boolean;
  children: ReactNode;
};

export function StorefrontTrialLockProvider({
  store,
  commerceLockActive,
  children,
}: StorefrontTrialLockProviderProps) {
  const [open, setOpen] = useState(false);

  const openVisitorTrialLock = useCallback(() => {
    if (commerceLockActive) setOpen(true);
  }, [commerceLockActive]);

  const value = useMemo(() => ({ openVisitorTrialLock }), [openVisitorTrialLock]);

  return (
    <StorefrontTrialLockContext.Provider value={value}>
      {children}
      {open && store ? <StoreVisitorTrialLockModal store={store} onClose={() => setOpen(false)} /> : null}
    </StorefrontTrialLockContext.Provider>
  );
}
