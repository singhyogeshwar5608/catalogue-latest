'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { getStoreBySlugFromApi, getProductsByStore, getStoreReviews } from '@/src/lib/api';
import { getCategoryById } from '@/data/categories';
import StoreView from '@/components/store/StoreView';
import PublicStorefrontAccessGate from '@/components/PublicStorefrontAccessGate';
import type { Store, Product, Review } from '@/types';
import { formatStoreName } from '@/src/lib/format';
import { useAuth } from '@/src/context/AuthContext';

type ParamsPromise = Promise<{ username: string }>;

const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&h=200&fit=crop';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1600&h=600&fit=crop';

const categoryImagery: Record<string, { banner: string; logo: string }> = {
  audio: {
    banner: 'https://images.unsplash.com/photo-1518444028781-03ed8a5b297f?w=1600&h=600&fit=crop',
    logo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&h=200&fit=crop',
  },
  clothing: {
    banner: 'https://images.unsplash.com/photo-1521572267360-1d61bda505d4?w=1600&h=600&fit=crop',
    logo: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop',
  },
  decor: {
    banner: 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=1600&h=600&fit=crop',
    logo: 'https://images.unsplash.com/photo-1525104698733-6fa8e9c7c16f?w=200&h=200&fit=crop',
  },
  food: {
    banner: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&h=600&fit=crop',
    logo: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
  },
};

const getCategoryAssets = (categoryId?: string) => {
  if (!categoryId) return { banner: DEFAULT_BANNER, logo: DEFAULT_LOGO };
  return categoryImagery[categoryId] ?? { banner: DEFAULT_BANNER, logo: DEFAULT_LOGO };
};

export default function AutoCatalogPage({ params }: { params: ParamsPromise }) {
  const { user } = useAuth();
  const [storeData, setStoreData] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ username: string } | null>(null);
  const [hasPendingRegistration, setHasPendingRegistration] = useState(false);

  useEffect(() => {
    let isMounted = true;
    params.then((value) => {
      if (isMounted) {
        setResolvedParams(value);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.username) return;

    const pendingRegistration = localStorage.getItem('pendingRegistration');
    setHasPendingRegistration(Boolean(pendingRegistration));

    if (pendingRegistration) {
      try {
        const regData = JSON.parse(pendingRegistration);
        const category = regData?.categoryId ? getCategoryById(regData.categoryId) : undefined;
        const assets = getCategoryAssets(regData?.categoryId);
        const username = regData?.userData?.username || resolvedParams.username;
        const autoStore: Store = {
          id: `auto-${username}`,
          username,
          name: formatStoreName(regData?.userData?.businessName || 'My New Store'),
          logo: regData?.userData?.logo || assets.logo,
          banner: regData?.userData?.banner || assets.banner,
          description:
            regData?.userData?.about ||
            `Welcome to ${regData?.userData?.businessName || 'our store'}! We offer curated selections for you.`,
          shortDescription: category?.description || 'Handpicked favourites for every shopper.',
          rating: 4.9,
          totalReviews: 120,
          isVerified: true,
          isBoosted: false,
          businessType: category?.name || 'General',
          location: regData?.userData?.city || 'India',
          whatsapp: regData?.userData?.phone || '+91 9876543210',
          layoutType: 'layout1',
          categoryId: regData?.categoryId,
          themeId: regData?.themeId,
          createdAt: new Date().toISOString(),
        };

        setStoreData(autoStore);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Failed to read pending registration', error);
      }
    }

    // Fetch store data, products, and reviews from API
    const fetchStoreData = async () => {
      try {
        const store = await getStoreBySlugFromApi(resolvedParams.username);
        setStoreData(store);

        if (store) {
          // Fetch products and reviews
          try {
            const storeProducts = await getProductsByStore(store.id);
            setProducts(storeProducts.slice(0, 12));
          } catch (productError) {
            console.error('Failed to fetch products:', productError);
            setProducts([]);
          }

          try {
            const reviewsResponse = await getStoreReviews(store.id);
            setReviews(reviewsResponse.reviews.slice(0, 6));
          } catch (reviewError) {
            console.error('Failed to fetch reviews:', reviewError);
            setReviews([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch store:', error);
        setStoreData(null);
        setProducts([]);
        setReviews([]);
      }
      setLoading(false);
    };

    fetchStoreData();
  }, [resolvedParams?.username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your catalog...</p>
        </div>
      </div>
    );
  }

  if (!storeData) {
    notFound();
  }

  // Use the fetched products and reviews from state
  const productsToDisplay = products;
  const reviewsToDisplay = reviews;

  return (
    <div className="pb-12">
      <PublicStorefrontAccessGate store={storeData} user={user ?? null}>
        <StoreView
          store={storeData}
          products={productsToDisplay}
          services={[]}
          reviews={reviewsToDisplay}
          onStoreUpdated={(next) => setStoreData(next)}
        />
      </PublicStorefrontAccessGate>
    </div>
  );
}
