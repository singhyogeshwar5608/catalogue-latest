export const getBannerIndex = (
  storeId: number | string | undefined,
  bannerImages: string[]
): number => {
  if (!Array.isArray(bannerImages) || bannerImages.length === 0) {
    return 0;
  }

  const numericId = typeof storeId === 'number'
    ? storeId
    : Number.parseInt(String(storeId ?? 0), 10) || 0;

  if (numericId === 0 || !Number.isFinite(numericId)) {
    return 0;
  }

  const normalizedId = Math.abs(Math.trunc(numericId));
  return (normalizedId - 1) % bannerImages.length;
};
