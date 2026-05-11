import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Store } from '@/types';
import { Star, MapPin, Phone } from 'lucide-react';
import { getStoreBannerImage } from '@/utils/storeBanner';
import {
  FACEBOOK_SOCIAL_BRAND_ICON_URL,
  INSTAGRAM_SOCIAL_BRAND_ICON_URL,
  LINKEDIN_SOCIAL_BRAND_ICON_URL,
  SOCIAL_BRAND_ICON_DISPLAY_PX,
  SOCIAL_BRAND_ICON_ROW_GAP_PX,
  YOUTUBE_SOCIAL_BRAND_ICON_URL,
} from '@/src/lib/socialBrandAssets';
import { formatStoreDistrictState } from '@/src/lib/formatStoreDistrictState';

interface StoreProfileCardProps {
  store: Store;
  categoryBannerIndex?: number;
}

export default function StoreProfileCard({ store, categoryBannerIndex }: StoreProfileCardProps) {
  const planIdentifier = store.activeSubscription?.plan?.slug?.toLowerCase()
    ?? store.activeSubscription?.plan?.name?.toLowerCase()
    ?? '';
  const isProPlan = planIdentifier.includes('pro');

  const heroBannerImage = useMemo(() => {
    return getStoreBannerImage({
      storeId: store.id,
      storeBannerImage: store.storeBannerImage,
      resolvedBannerImage: store.banner,
      category: store.category,
      preferredIndex: typeof categoryBannerIndex === 'number' ? categoryBannerIndex : null,
    });
  }, [store.id, store.storeBannerImage, store.banner, store.category, categoryBannerIndex]);

  const fallbackGradientStyle = useMemo(() => {
    const baseColor = store.categoryBannerColor ?? '#1e40af';
    return {
      background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}cc 50%, #0f172a 100%)`,
    } as const;
  }, [store.categoryBannerColor]);

  const socialLinks = [
    {
      href: store.socialLinks?.facebook,
      iconSrc: FACEBOOK_SOCIAL_BRAND_ICON_URL,
      label: 'Facebook',
    },
    {
      href: store.socialLinks?.instagram,
      iconSrc: INSTAGRAM_SOCIAL_BRAND_ICON_URL,
      label: 'Instagram',
    },
    {
      href: store.socialLinks?.youtube,
      iconSrc: YOUTUBE_SOCIAL_BRAND_ICON_URL,
      label: 'YouTube',
    },
    {
      href: store.socialLinks?.linkedin,
      iconSrc: LINKEDIN_SOCIAL_BRAND_ICON_URL,
      label: 'LinkedIn',
    },
  ].filter((link) => Boolean(link.href));

  return (
    <Link href={`/store/${store.username}`}>
      <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(15,23,42,0.5)]">
        {/* Banner Background */}
        <div className="relative h-48 w-full overflow-hidden">
          {heroBannerImage ? (
            <Image
              src={heroBannerImage}
              alt={`${store.name} banner`}
              fill
              sizes="400px"
              className="object-cover"
              priority={false}
            />
          ) : (
            <div className="absolute inset-0" style={fallbackGradientStyle} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-transparent" />
          
          {/* PRO Badge */}
          {isProPlan && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                PRO
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="relative px-6 pb-6 pt-4">
          {/* Logo - Overlapping Banner */}
          <div className="absolute left-1/2 -top-12 -translate-x-1/2">
            <div className="relative inline-flex items-center justify-center">
              <img
                src={store.logo}
                alt={store.name}
                width={96}
                height={96}
                className="h-24 w-24 rounded-2xl object-cover shadow-xl"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Store Name */}
          <div className="mt-14 text-center">
            <h3 className="text-2xl font-bold text-white line-clamp-1">
              {store.name}
            </h3>
            
            {/* PRO STORE Badge */}
            {isProPlan && (
              <div className="mt-2 flex justify-center">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                  PRO STORE
                </span>
              </div>
            )}
          </div>

          {/* Location and Rating */}
          <div className="mt-4 flex flex-col items-center gap-2 text-sm text-white/90">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0 text-white/80" />
              <span className="font-medium line-clamp-1">{store.address || formatStoreDistrictState(store)}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 flex-shrink-0 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{store.rating}</span>
              <span className="text-white/70">· {store.totalReviews}+ reviews</span>
            </div>
          </div>

          {/* Category and Phone */}
          <div className="mt-3 flex flex-col items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-blue-300">
              <span className="font-medium">{store.categoryName ?? store.businessType}</span>
            </div>
            
            {store.showPhone !== false && store.whatsapp && (
              <div className="flex items-center gap-1.5 text-white/80">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{store.whatsapp}</span>
              </div>
            )}
          </div>

          {/* Social Media Icons - Only on Mobile */}
          {socialLinks.length > 0 && (
            <div className="mt-5 flex w-full min-w-0 justify-center md:hidden">
              <div
                className="flex flex-nowrap items-center justify-center gap-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                style={
                  SOCIAL_BRAND_ICON_ROW_GAP_PX > 0
                    ? { gap: `${SOCIAL_BRAND_ICON_ROW_GAP_PX}px` }
                    : undefined
                }
              >
              {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex shrink-0 items-center justify-center rounded-md p-0 leading-none transition hover:opacity-90 hover:-translate-y-0.5"
                    aria-label={link.label}
                  >
                    <img
                      src={link.iconSrc}
                      alt=""
                      width={SOCIAL_BRAND_ICON_DISPLAY_PX}
                      height={SOCIAL_BRAND_ICON_DISPLAY_PX}
                      className="block object-contain align-middle"
                      style={{
                        width: SOCIAL_BRAND_ICON_DISPLAY_PX,
                        height: SOCIAL_BRAND_ICON_DISPLAY_PX,
                      }}
                      aria-hidden
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
