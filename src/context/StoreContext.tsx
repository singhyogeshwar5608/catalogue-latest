"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { getMyStores } from '@/src/lib/api';
import type { StoreSummary } from '@/types/api';

interface StoreContextValue {
  stores: StoreSummary[];
  selectedStoreId: string | null;
  selectedStore: StoreSummary | null;
  selectStore: (storeId: string) => void;
  refreshStores: (options?: { silent?: boolean }) => Promise<void>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);
const SELECTED_STORE_STORAGE_KEY = 'catelog-selected-store-id';

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const persistSelectedStore = useCallback((storeId: string | null) => {
    if (typeof window === 'undefined') return;
    if (storeId) {
      window.localStorage.setItem(SELECTED_STORE_STORAGE_KEY, storeId);
    } else {
      window.localStorage.removeItem(SELECTED_STORE_STORAGE_KEY);
    }
  }, []);

  const selectStore = useCallback(
    (storeId: string) => {
      setSelectedStoreId(storeId);
      persistSelectedStore(storeId);
    },
    [persistSelectedStore]
  );

  useEffect(() => {
    if (!user) {
      setStores([]);
      setSelectedStoreId(null);
      persistSelectedStore(null);
      return;
    }

    const nextStores = Array.isArray(user.stores) ? user.stores : [];
    setStores(nextStores);

    if (nextStores.length === 0) {
      setSelectedStoreId(null);
      persistSelectedStore(null);
      return;
    }

    if (typeof window === 'undefined') {
      setSelectedStoreId(nextStores[0].id);
      return;
    }

    const storedId = window.localStorage.getItem(SELECTED_STORE_STORAGE_KEY);
    const fallbackStore =
      nextStores.find((store) => store.id === storedId) ||
      nextStores.find((store) => store.slug === user.storeSlug) ||
      nextStores[0];

    setSelectedStoreId(fallbackStore?.id ?? null);
    persistSelectedStore(fallbackStore?.id ?? null);
  }, [user, persistSelectedStore]);

  const refreshStores = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setStores([]);
      setSelectedStoreId(null);
      persistSelectedStore(null);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const fullStores = await getMyStores();
      const summaries: StoreSummary[] = fullStores.map((store) => ({
        id: store.id,
        name: store.name,
        slug: store.username,
      }));

      setStores(summaries);
      if (user) {
        const nextUser = { ...user, stores: summaries };
        if (!nextUser.storeSlug && summaries[0]) {
          nextUser.storeSlug = summaries[0].slug;
        }
        setUser(nextUser);
      }

      if (!summaries.length) {
        setSelectedStoreId(null);
        persistSelectedStore(null);
        return;
      }

      setSelectedStoreId((current) => {
        if (current && summaries.some((store) => store.id === current)) {
          return current;
        }
        const fallbackId = summaries[0].id;
        persistSelectedStore(fallbackId);
        return fallbackId;
      });
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [persistSelectedStore, setUser, user]);

  const value = useMemo<StoreContextValue>(
    () => ({
      stores,
      selectedStoreId,
      selectedStore: stores.find((store) => store.id === selectedStoreId) ?? null,
      selectStore,
      refreshStores,
      loading,
    }),
    [stores, selectedStoreId, selectStore, refreshStores, loading]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStoreSelection = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreSelection must be used within a StoreProvider');
  }
  return context;
};
