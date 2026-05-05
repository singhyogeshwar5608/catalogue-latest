'use client';

import type { Category } from '@/src/lib/api';
import { getStoreBannerImage } from '@/utils/storeBanner';

interface DynamicBannerProps {
  category?: Category | null;
  storeId?: number | string;
  storeName?: string;
  storeBannerImage?: string | null;
  resolvedBannerImage?: string | null;
}

const DynamicBanner = ({ category, storeId, storeName, storeBannerImage, resolvedBannerImage }: DynamicBannerProps) => {
  const currentImage = getStoreBannerImage({
    storeId,
    storeBannerImage,
    resolvedBannerImage,
    category,
  });
  const title = category?.banner_title?.trim() || category?.name || storeName || 'Store';
  const subtitle = category?.banner_subtitle?.trim();

  return (
    <section className="relative w-full overflow-hidden bg-[#0b1120] text-white">
      <div className="relative w-full aspect-[4/5] sm:aspect-auto sm:min-h-[360px] lg:min-h-[520px]">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={
            currentImage
              ? {
                  backgroundImage: `url(${currentImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : { backgroundColor: '#1a1a2e' }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />

      </div>
    </section>
  );
};

export default DynamicBanner;
