'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Star, Phone, Check } from 'lucide-react';
import type { Store } from '@/types';
import { getStoreBannerImage } from '@/utils/storeBanner';
import { formatStoreDistrictState } from '@/src/lib/formatStoreDistrictState';
import { useLocationContext } from '@/src/context/LocationContext';
import { parseDistanceKm } from '@/src/lib/geo';
import {
  DISTANCE_CHIP_TITLE,
  formatKmDistanceLabel,
  parseViewerLatLng,
  viewerStoreDistanceKmLabel,
} from '@/src/lib/distanceUi';

type VerifiedSellerCardProps = {
  store: Store;
  categoryBannerIndex?: number;
  isMobileFeatured?: boolean;
  /** When true, always show the blue tick (used for paid-plan seller lists). */
  forceVerifiedBadge?: boolean;
};

export default function VerifiedSellerCard({
  store,
  categoryBannerIndex,
  isMobileFeatured = false,
  forceVerifiedBadge = false,
}: VerifiedSellerCardProps) {
  const { location } = useLocationContext();
  const viewerLL = parseViewerLatLng(location);
  const viewerLocationReady = viewerLL != null;

  const distanceChipText = useMemo(() => {
    if (!viewerLocationReady || !viewerLL) return null;
    const fromCoords = viewerStoreDistanceKmLabel(viewerLL.lat, viewerLL.lng, store.latitude, store.longitude);
    if (fromCoords) return fromCoords;
    const fromApi = parseDistanceKm(store.distanceKm);
    if (fromApi != null) return formatKmDistanceLabel(fromApi);
    return '—';
  }, [
    viewerLocationReady,
    viewerLL,
    store.latitude,
    store.longitude,
    store.distanceKm,
  ]);

  const initials = store.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? '')
    .join('') || 'ST';
  const heroImage = getStoreBannerImage({
    storeId: store.id,
    storeBannerImage: store.storeBannerImage,
    resolvedBannerImage: store.banner,
    category: store.category,
    preferredIndex: typeof categoryBannerIndex === 'number' ? categoryBannerIndex : null,
  });
  const gradientBackground = 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)';
  const stats = [
    { label: 'Followers', value: store.followersCount ?? 0 },
    { label: 'Likes', value: store.likesCount ?? 0 },
    { label: 'Views', value: store.seenCount ?? 0 },
  ];

  const renderRatingStars = (rating: number) =>
    Array.from({ length: 5 }, (_, index) => {
      const delta = rating - index;
      const isFull = delta >= 1;
      const isHalf = delta > 0 && delta < 1;
      return (
        <span key={`verified-star-${index}`} className="relative inline-flex h-3 w-3 md:h-3.5 md:w-3.5">
          <Star className="absolute inset-0 h-full w-full text-slate-300" />
          {isFull ? (
            <Star className="absolute inset-0 h-full w-full fill-amber-400 text-amber-400" />
          ) : isHalf ? (
            <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="h-full w-full fill-amber-400 text-amber-400" />
            </span>
          ) : null}
        </span>
      );
    });

  return (
    <Link
      href={`/store/${store.username}`}
      prefetch
      className={`mx-auto flex min-h-0 max-w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-500 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${isMobileFeatured ? 'w-full' : 'w-[90%]'}`}
      aria-label={`Open ${store.name} store page`}
    >
      <div className={`relative z-10 w-full shrink-0 overflow-visible md:h-[160px] ${isMobileFeatured ? 'h-[144px]' : 'h-[96px]'}`}>
        {heroImage ? (
          <img
            src={heroImage}
            alt={`${store.name} banner`}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0" style={{ background: gradientBackground }} />
        )}
        <div className="absolute -bottom-6 left-4 z-20 inline-flex h-11 w-11 items-center justify-center overflow-visible rounded-full border-2 border-white bg-[#533AB7] text-[11px] font-semibold text-white shadow-md md:h-14 md:w-14 md:text-sm">
          {store.logo ? (
            <span className="absolute inset-0 overflow-hidden rounded-full">
              <img
                src={store.logo}
                alt={store.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </span>
          ) : (
            initials
          )}
          {(forceVerifiedBadge || store.isVerified || store.isBoosted || store.activeSubscription) ? (
            <span className="absolute -right-1.5 -top-1.5 z-30 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 ring-2 ring-white md:h-5 md:w-5">
              <Check className="h-2.5 w-2.5 text-white md:h-3 md:w-3" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="relative z-0 flex min-h-0 w-full flex-1 flex-col bg-white px-3 pb-2 pt-6 md:px-4 md:pb-2.5 md:pt-7">
        <div className="isolate flex min-h-0 w-full items-start justify-between gap-2">
          <h3 className="line-clamp-1 min-w-0 flex-1 overflow-hidden text-[12px] font-bold text-slate-900 md:text-[15px]">
            {store.name}
          </h3>
          {viewerLocationReady && distanceChipText !== null ? (
            <span
              className="relative z-[2] shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-700 md:text-[11px]"
              title={
                distanceChipText === '—'
                  ? 'Distance unavailable — store is not pinned on the map.'
                  : DISTANCE_CHIP_TITLE
              }
            >
              {distanceChipText}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600 md:text-xs">
          <div className="flex items-center gap-0.5">{renderRatingStars(Number(store.rating) || 0)}</div>
          <span className="font-medium text-slate-700">{Number(store.rating || 0).toFixed(1)}</span>
          <span className="text-slate-500">({store.totalReviews})</span>
        </div>

        <div className="mt-1.5 space-y-1.5 md:mt-2 md:space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-800 md:text-xs">
              <MapPin className="h-3 w-3 shrink-0 text-slate-700 md:h-3.5 md:w-3.5" />
              <span className="line-clamp-1 break-words text-left">{formatStoreDistrictState(store)}</span>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-800 md:text-xs">
              <Phone className="h-3 w-3 shrink-0 text-slate-700 md:h-3.5 md:w-3.5" />
              <span className="line-clamp-1 break-all text-right">{store.whatsapp || store.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 rounded-lg text-center md:mt-3">
          {stats.map((item) => (
            <div key={item.label} className="px-1 py-1.5 md:py-2">
              <p className="text-[12px] font-bold text-slate-900 md:text-[14px]">{item.value}</p>
              <p className="text-[9px] text-slate-500 md:text-[10px]">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-1 gap-1.5 border-t border-slate-200 pt-1.5 md:mt-2.5 md:gap-2 md:pt-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-1 py-1 text-[10px] font-medium text-white md:px-2 md:py-1.5 md:text-xs">
            Visit
          </span>
        </div>

      </div>
    </Link>
  );
}
