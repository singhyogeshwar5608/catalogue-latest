'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BuyerDetailsFormModal,
  BUYER_DETAILS_GATE_CANCELLED,
  hasValidBuyerDetails,
  normalizeBuyerDetailsFromStorage,
  type StoreBuyerDetails,
} from '@/components/store/BuyerDetailsFormModal';

export { BUYER_DETAILS_GATE_CANCELLED };

type Options = {
  /** Session key segment: `storeBuyerDetails:${sessionUsername}` */
  sessionUsername: string | null | undefined;
  storeName: string;
  accentColor?: string;
};

export function useBuyerDetailsCheckoutGate({
  sessionUsername,
  storeName,
  accentColor = '#FF9F29',
}: Options) {
  const buyerDetailsStorageKey = sessionUsername?.trim()
    ? `storeBuyerDetails:${sessionUsername.trim()}`
    : null;

  const [buyerDetails, setBuyerDetails] = useState<StoreBuyerDetails | null>(null);
  const [buyerFormOpen, setBuyerFormOpen] = useState(false);
  const buyerDetailsRef = useRef<StoreBuyerDetails | null>(null);
  const pendingBuyerGateRef = useRef<{
    fn: () => Promise<void>;
    resolve: () => void;
    reject: (e: Error) => void;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !buyerDetailsStorageKey) {
      buyerDetailsRef.current = null;
      setBuyerDetails(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem(buyerDetailsStorageKey);
      if (raw) {
        const parsed = normalizeBuyerDetailsFromStorage(JSON.parse(raw));
        if (parsed) {
          buyerDetailsRef.current = parsed;
          setBuyerDetails(parsed);
        } else {
          buyerDetailsRef.current = null;
          setBuyerDetails(null);
        }
      } else {
        buyerDetailsRef.current = null;
        setBuyerDetails(null);
      }
    } catch {
      buyerDetailsRef.current = null;
      setBuyerDetails(null);
    }
  }, [buyerDetailsStorageKey]);

  const getBuyerDetails = useCallback(() => buyerDetailsRef.current, []);

  const ensureBuyerDetailsThen = useCallback(async (fn: () => Promise<void>) => {
    if (hasValidBuyerDetails(buyerDetailsRef.current)) {
      await fn();
      return;
    }
    return new Promise<void>((resolve, reject) => {
      pendingBuyerGateRef.current = { fn, resolve, reject };
      setBuyerFormOpen(true);
    });
  }, []);

  const handleBuyerFormSubmit = useCallback(
    (d: StoreBuyerDetails) => {
      buyerDetailsRef.current = d;
      setBuyerDetails(d);
      if (buyerDetailsStorageKey) {
        try {
          sessionStorage.setItem(buyerDetailsStorageKey, JSON.stringify(d));
        } catch {
          /* ignore */
        }
      }
      setBuyerFormOpen(false);
      const pending = pendingBuyerGateRef.current;
      pendingBuyerGateRef.current = null;
      if (pending) {
        void pending
          .fn()
          .then(() => pending.resolve())
          .catch((e) => pending.reject(e instanceof Error ? e : new Error(String(e))));
      }
    },
    [buyerDetailsStorageKey],
  );

  const handleBuyerFormDismiss = useCallback(() => {
    setBuyerFormOpen(false);
    const pending = pendingBuyerGateRef.current;
    pendingBuyerGateRef.current = null;
    if (pending) {
      pending.reject(new Error(BUYER_DETAILS_GATE_CANCELLED));
    }
  }, []);

  const buyerDetailsModal = (
    <BuyerDetailsFormModal
      open={buyerFormOpen}
      storeName={storeName}
      initial={buyerDetails}
      accentColor={accentColor}
      onSubmit={handleBuyerFormSubmit}
      onDismiss={handleBuyerFormDismiss}
    />
  );

  return {
    getBuyerDetails,
    ensureBuyerDetailsThen,
    buyerDetailsModal,
  };
}
