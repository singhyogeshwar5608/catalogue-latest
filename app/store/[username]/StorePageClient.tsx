'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreView from '@/components/store/StoreView';
import PublicStorefrontAccessGate from '@/components/PublicStorefrontAccessGate';
import type { Store, Product, Review, Service, RatingSummary, ReviewPagination } from '@/types';
import {
  getProductsByStore,
  getServicesByStore,
  getStoreBySlugFromApi,
  getStoreReviews,
  recordStoreView,
  submitStoreReview,
  toggleStoreFollow,
  toggleStoreLike,
  updateStore,
  isApiError,
} from '@/src/lib/api';
import { perfLog } from '@/src/lib/perfLog';
import { useAuth } from '@/src/context/AuthContext';
import { dispatchStoreProfileRefresh } from '@/src/lib/storeSubscriptionAddons';
import { hydrateListingStoreCoords } from '@/src/lib/hydrateListingStoreCoords';

type StorePageClientProps = {
  username: string;
  initialStore?: Store | null;
  initialProducts?: Product[];
  initialServices?: Service[];
  initialReviews?: Review[];
  initialReviewSummary?: RatingSummary | null;
  initialReviewPagination?: ReviewPagination | null;
  /** When true, store/catalog payload came from the server; client refresh won’t block the shell. */
  serverHydrated?: boolean;
};

export default function StorePageClient({
  username,
  initialStore = null,
  initialProducts = [],
  initialServices = [],
  initialReviews = [],
  initialReviewSummary = null,
  initialReviewPagination = null,
  serverHydrated = false,
}: StorePageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(initialStore);
  const [products, setProducts] = useState<Product[]>(() =>
    initialStore ? hydrateListingStoreCoords(initialProducts, initialStore) : initialProducts,
  );
  const [services, setServices] = useState<Service[]>(() =>
    initialStore ? hydrateListingStoreCoords(initialServices, initialStore) : initialServices,
  );
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reviewSummary, setReviewSummary] = useState<RatingSummary | null>(initialReviewSummary);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination | null>(initialReviewPagination);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [loading, setLoading] = useState(!serverHydrated && initialStore === null);
  const [error, setError] = useState<string | null>(null);
  const [seenSyncedForStore, setSeenSyncedForStore] = useState<string | null>(null);
  const seenRequestInFlightRef = useRef<Set<string>>(new Set());

  const fetchStoreReviews = useCallback(
    async (storeId: string, page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const response = await getStoreReviews(storeId, { page, perPage: 5 });
        setReviewSummary(response.summary);
        setReviewPagination(response.pagination);
        setReviewPage(page);
        setReviews((previous) => (append ? [...previous, ...response.reviews] : response.reviews));
      } catch (err) {
        setReviewsError(
          isApiError(err)
            ? err.message || 'Unable to load reviews'
            : err instanceof Error
              ? err.message
              : 'Unable to load reviews'
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    []
  );

  const handleLoadMoreReviews = useCallback(() => {
    if (!store || !reviewPagination?.hasMore || reviewsLoading) return;
    const nextPage = reviewPage + 1;
    fetchStoreReviews(store.id, nextPage, true);
  }, [store, reviewPagination?.hasMore, reviewsLoading, reviewPage, fetchStoreReviews]);

  const handleSubmitStoreReview = useCallback(
    async (payload: { rating: number; comment: string }) => {
      if (!store?.id) {
        throw new Error('Store not available');
      }

      const response = await submitStoreReview(store.id, payload);

      setReviews((previous) => {
        const filtered = previous.filter((review) => review.id !== response.review.id);
        return [response.review, ...filtered];
      });
      setReviewSummary(response.summary);
      setReviewPagination((previous) =>
        previous
          ? {
              ...previous,
              total: response.summary.totalReviews,
            }
          : previous
      );
    },
    [store]
  );

  const applyEngagementTogglePayload = useCallback(
    (
      previous: Store,
      payload: {
        followers_count?: number;
        likes_count?: number;
        viewer_following?: boolean;
        viewer_liked?: boolean;
        viewerFollowing?: boolean;
        viewerLiked?: boolean;
      }
    ): Store => {
      const vfRaw = payload.viewer_following ?? payload.viewerFollowing;
      const vlRaw = payload.viewer_liked ?? payload.viewerLiked;
      return {
        ...previous,
        followersCount:
          typeof payload.followers_count === 'number' ? payload.followers_count : previous.followersCount,
        likesCount: typeof payload.likes_count === 'number' ? payload.likes_count : previous.likesCount,
        // Only overwrite when the API sends an explicit boolean (missing keys stay as-is so one toggle
        // cannot clear the other when proxies/old payloads omit a field).
        viewerFollowing: typeof vfRaw === 'boolean' ? vfRaw : previous.viewerFollowing,
        viewerLiked: typeof vlRaw === 'boolean' ? vlRaw : previous.viewerLiked,
      };
    },
    []
  );

  const handleToggleFollow = useCallback(async () => {
    if (!store?.id || followBusy) return;
    setFollowBusy(true);
    try {
      const response = await toggleStoreFollow(store.id);
      const payload = response.data;
      setStore((previous) => (previous ? applyEngagementTogglePayload(previous, payload) : previous));
    } catch (err) {
      console.warn('Unable to toggle follow', err);
    } finally {
      setFollowBusy(false);
    }
  }, [applyEngagementTogglePayload, followBusy, store?.id]);

  const handleToggleLike = useCallback(async () => {
    if (!store?.id || likeBusy) return;
    setLikeBusy(true);
    try {
      const response = await toggleStoreLike(store.id);
      const payload = response.data;
      setStore((previous) => (previous ? applyEngagementTogglePayload(previous, payload) : previous));
    } catch (err) {
      console.warn('Unable to toggle like', err);
    } finally {
      setLikeBusy(false);
    }
  }, [applyEngagementTogglePayload, likeBusy, store?.id]);

  const handleSocialLinkChange = useCallback(async (platform: string, url: string) => {
    if (!store?.id) return;
    try {
      const fieldMap: Record<string, string> = {
        facebook: 'facebook_url',
        instagram: 'instagram_url',
        youtube: 'youtube_url',
        linkedin: 'linkedin_url',
      };
      const field = fieldMap[platform];
      if (!field) return;

      const { store: updatedStore } = await updateStore({
        id: store.id,
        [field]: url,
      });
      setStore(updatedStore);
    } catch (error) {
      console.error('Failed to update social link:', error);
      alert('Failed to update social link. Please try again.');
    }
  }, [store?.id]);

  useEffect(() => {
    if (!store?.id) return;
    if (seenSyncedForStore === store.id) return;
    if (seenRequestInFlightRef.current.has(store.id)) return;
    const dedupeWindowMs = 5000;
    if (typeof window !== 'undefined') {
      const w = window as Window & { __storeSeenLastSentAt?: Record<string, number> };
      const now = Date.now();
      const lastSentAt = w.__storeSeenLastSentAt?.[store.id] ?? 0;
      if (now - lastSentAt < dedupeWindowMs) {
        setSeenSyncedForStore(store.id);
        return;
      }
    }

    let cancelled = false;
    const syncSeen = async () => {
      try {
        seenRequestInFlightRef.current.add(store.id);
        const response = await recordStoreView(store.id);
        if (cancelled) return;
        if (typeof window !== 'undefined') {
          const w = window as Window & { __storeSeenLastSentAt?: Record<string, number> };
          w.__storeSeenLastSentAt = {
            ...(w.__storeSeenLastSentAt ?? {}),
            [store.id]: Date.now(),
          };
        }
        setStore((previous) =>
          previous
            ? {
                ...previous,
                seenCount: response.data.seen_count,
              }
            : previous
        );
        dispatchStoreProfileRefresh();
        setSeenSyncedForStore(store.id);
      } catch (err) {
        console.warn('Unable to record store view', err);
      } finally {
        seenRequestInFlightRef.current.delete(store.id);
      }
    };

    void syncSeen();
    return () => {
      cancelled = true;
    };
  }, [seenSyncedForStore, store?.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchStore = async () => {
      const blockingSpinner = !serverHydrated;
      if (blockingSpinner) {
        setLoading(true);
      }
      setError(null);
      try {
        const fetchedStore = await getStoreBySlugFromApi(username);
        const fetchedProducts = await getProductsByStore(fetchedStore.id);
        let fetchedServices: Service[] = [];
        if (fetchedStore?.id) {
          try {
            fetchedServices = await getServicesByStore(fetchedStore.id);
          } catch (serviceError) {
            console.warn('Unable to load services', serviceError);
          }
        }
        if (!isMounted) return;
        setStore(fetchedStore ?? null);
        setSeenSyncedForStore(null);
        setProducts(hydrateListingStoreCoords(fetchedProducts ?? [], fetchedStore ?? null));
        setServices(hydrateListingStoreCoords(fetchedServices ?? [], fetchedStore ?? null));
        if (fetchedStore?.id) {
          fetchStoreReviews(fetchedStore.id);
        } else {
          setReviews([]);
          setReviewSummary(null);
          setReviewPagination(null);
        }
        if (serverHydrated) {
          perfLog('store', 'client refresh merged (RSC + guest token)');
        }
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          if (err.status === 401) {
            router.replace('/login');
            return;
          }
          setError(err.message || 'Unable to load store');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load store');
        }
        if (!serverHydrated) {
          setStore(null);
          setProducts([]);
          setServices([]);
          setReviews([]);
          setReviewSummary(null);
          setReviewPagination(null);
        }
      } finally {
        if (isMounted && blockingSpinner) {
          setLoading(false);
        }
      }
    };

    fetchStore();

    return () => {
      isMounted = false;
    };
  }, [username, router, fetchStoreReviews, serverHydrated]);

  useEffect(() => {
    if (store && !loading) {
      perfLog('store', 'shell ready');
    }
  }, [store, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading store...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Store unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Store Not Found</h1>
          <p className="text-gray-600">The store you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <PublicStorefrontAccessGate store={store} user={user}>
      <StoreView
        store={store}
        products={products}
        services={services}
        reviews={reviews}
        reviewSummary={reviewSummary ?? undefined}
        reviewPagination={reviewPagination ?? undefined}
        reviewsLoading={reviewsLoading}
        reviewsError={reviewsError}
        onLoadMoreReviews={handleLoadMoreReviews}
        onSubmitStoreReview={handleSubmitStoreReview}
        onToggleFollow={handleToggleFollow}
        onToggleLike={handleToggleLike}
        followBusy={followBusy}
        likeBusy={likeBusy}
        onStoreUpdated={(next) => setStore(next)}
        onSocialLinkChange={handleSocialLinkChange}
      />
    </PublicStorefrontAccessGate>
  );
}
