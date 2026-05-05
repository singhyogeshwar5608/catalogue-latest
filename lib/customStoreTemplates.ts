import type { Store, Product, Review } from '@/types';

export const generateStarterProducts = (store: Store): Product[] => {
  const baseProducts = [
    {
      name: `${store.businessType} Essential Kit`,
      description: `Curated ${store.businessType.toLowerCase()} collection picked by ${store.name}.`,
      price: 1499,
      originalPrice: 1999,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
      category: store.businessType,
    },
    {
      name: `${store.businessType} Bestseller`,
      description: 'Top rated item customers love.',
      price: 2299,
      originalPrice: 2899,
      image: 'https://images.unsplash.com/photo-1483193722442-5422d99849f5?w=500&h=500&fit=crop',
      category: store.businessType,
    },
    {
      name: 'Limited Edition Drop',
      description: 'Available in limited quantities. Order before it sells out.',
      price: 3299,
      image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=500&h=500&fit=crop',
      category: 'Featured',
    },
    {
      name: 'Gift Bundle',
      description: 'Perfect bundle curated for gifting.',
      price: 1899,
      image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&h=500&fit=crop',
      category: 'Bundles',
    },
  ];

  return baseProducts.map((product, index) => ({
    id: `${store.id}-custom-product-${index + 1}`,
    storeId: store.id,
    storeName: store.name,
    rating: 4.8 - index * 0.1,
    totalReviews: 40 + index * 7,
    inStock: true,
    images: [product.image],
    ...product,
  }));
};

export const generateStarterReviews = (store: Store): Review[] => {
  const sentiments = [
    {
      name: 'Aarav',
      avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=100&h=100&fit=crop',
      comment: 'Amazing quality!',
    },
    {
      name: 'Kashish',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      comment: 'Great service & fast delivery.',
    },
    {
      name: 'Rahul',
      avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop',
      comment: 'Love the curation.',
    },
    {
      name: 'Simran',
      avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=100&h=100&fit=crop',
      comment: 'Highly recommended store.',
    },
  ];

  return sentiments.map((review, index) => ({
    id: `${store.id}-custom-review-${index + 1}`,
    storeId: store.id,
    userName: review.name,
    userAvatar: review.avatar,
    rating: 5 - (index % 2 === 0 ? 0 : 0.5),
    comment: review.comment,
    reviewedAt: new Date(Date.now() - index * 86400000).toISOString(),
    isApproved: true,
  }));
};
