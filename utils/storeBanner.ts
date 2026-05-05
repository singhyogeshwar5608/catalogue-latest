import { getBannerIndex } from '@/utils/bannerDistribution';

type BannerCategory = {
  banner_image?: string | null;
  banner_images?: string[] | null;
} | null | undefined;

type StoreBannerOptions = {
  storeId?: number | string;
  storeBannerImage?: string | null;
  resolvedBannerImage?: string | null;
  category?: BannerCategory;
  /** Prefer omitting: listing cards use a stable index from `storeId` so the same store looks identical in every section. */
  preferredIndex?: number | null;
};

export const getStoreBannerImage = ({
  storeId,
  storeBannerImage,
  resolvedBannerImage,
  category,
  preferredIndex,
}: StoreBannerOptions): string | null => {
  if (typeof storeBannerImage === 'string' && storeBannerImage.trim()) {
    return storeBannerImage;
  }

  // Prefer a concrete uploaded banner path even if only the resolved `store.banner` field carried it.
  if (typeof resolvedBannerImage === 'string' && resolvedBannerImage.includes('/storage/')) {
    const t = resolvedBannerImage.trim();
    if (t) return t;
  }

  const bannerImages = Array.isArray(category?.banner_images)
    ? category.banner_images.filter((url): url is string => Boolean(url && typeof url === 'string' && url.trim()))
    : [];

  if (bannerImages.length > 0) {
    if (typeof preferredIndex === 'number' && Number.isFinite(preferredIndex)) {
      return bannerImages[Math.abs(preferredIndex) % bannerImages.length] ?? null;
    }

    return bannerImages[getBannerIndex(storeId, bannerImages)] ?? null;
  }

  if (typeof category?.banner_image === 'string' && category.banner_image.trim()) {
    return category.banner_image;
  }

  if (typeof resolvedBannerImage === 'string' && resolvedBannerImage.trim()) {
    return resolvedBannerImage;
  }

  return null;
};
