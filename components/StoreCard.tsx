'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Store } from '@/types';
import { MapPin, Phone, Star, Check } from 'lucide-react';
import { getStoreBannerImage } from '@/utils/storeBanner';
import { useLocationContext } from '@/src/context/LocationContext';
import { formatStoreDistrictState } from '@/src/lib/formatStoreDistrictState';
import { parseDistanceKm } from '@/src/lib/geo';
import {
  DISTANCE_CHIP_TITLE,
  formatKmDistanceLabel,
  parseViewerLatLng,
  viewerStoreDistanceKmLabel,
} from '@/src/lib/distanceUi';

interface StoreCardProps {
  store: Store;
  isCompact?: boolean;
  categoryBannerIndex?: number;
  /** When true, always show the blue tick (used for paid-plan seller lists). */
  forceVerifiedBadge?: boolean;
}

export default function StoreCard({
  store,
  isCompact = false,
  categoryBannerIndex,
  forceVerifiedBadge = false,
}: StoreCardProps) {
  const { location } = useLocationContext();
  const viewerLL = parseViewerLatLng(location);
  const viewerLocationReady = viewerLL != null;

  const initials = useMemo(
    () =>
      store.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((chunk) => chunk[0]?.toUpperCase() ?? '')
        .join('') || 'ST',
    [store.name]
  );

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
    return {
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
    } as const;
  }, []);

  const stats = [
    { label: 'Followers', value: store.followersCount ?? 0 },
    { label: 'Likes', value: store.likesCount ?? 0 },
    { label: 'Views', value: store.seenCount ?? 0 },
  ];

  const displayLocation = useMemo(() => formatStoreDistrictState(store), [store]);

  const distanceChipText = useMemo(() => {
    if (!viewerLocationReady || !viewerLL) return null;
    const fromApi = parseDistanceKm(store.distanceKm);
    if (fromApi != null) return formatKmDistanceLabel(fromApi);
    const fromCoords = viewerStoreDistanceKmLabel(viewerLL.lat, viewerLL.lng, store.latitude, store.longitude);
    if (fromCoords) return fromCoords;
    return '—';
  }, [
    viewerLocationReady,
    viewerLL,
    store.latitude,
    store.longitude,
    store.distanceKm,
  ]);

  const distanceChipClass =
    `${isCompact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] md:text-[11px]'} shrink-0 rounded-full border border-emerald-200 bg-emerald-50 font-semibold tabular-nums text-emerald-700`;

  const renderRatingStars = (rating: number) =>
    Array.from({ length: 5 }, (_, index) => {
      const delta = rating - index;
      const isFull = delta >= 1;
      const isHalf = delta > 0 && delta < 1;
      return (
        <span key={`star-${index}`} className={`relative inline-flex ${isCompact ? 'h-2 w-2' : 'h-3 w-3 md:h-3.5 md:w-3.5'}`}>
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
      className={`flex min-h-0 max-w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-500 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08)] ${isCompact ? 'w-full' : 'mx-auto w-[90%]'}`}
      aria-label={`Open ${store.name} store page`}
    >
      <div className="relative z-10 h-[96px] w-full shrink-0 overflow-visible md:h-[160px]">
        {heroBannerImage ? (
          <img
            src={heroBannerImage}
            alt={`${store.name} banner`}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0" style={fallbackGradientStyle} />
        )}
        <div className={`absolute z-20 inline-flex items-center justify-center rounded-full border-2 border-white bg-[#533AB7] text-[11px] font-semibold text-white shadow-md overflow-visible ${isCompact ? '-bottom-5 left-3 h-9 w-9' : '-bottom-6 left-4 h-11 w-11 md:h-14 md:w-14 md:text-sm'}`}>
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
            <span>{initials}</span>
          )}
          {(forceVerifiedBadge || store.isVerified || store.isBoosted || store.activeSubscription) ? (
            <span className="absolute -right-1.5 -top-1.5 z-30 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 ring-2 ring-white md:h-5 md:w-5">
              <Check className="h-2.5 w-2.5 text-white md:h-3 md:w-3" />
            </span>
          ) : null}
        </div>
      </div>

      <div className={`relative z-0 flex min-h-0 w-full flex-1 flex-col bg-white ${isCompact ? 'px-2 pb-1.5 pt-5' : 'px-3 pb-2 pt-6 md:px-4 md:pb-2.5 md:pt-7'}`}>
        <div className="isolate flex min-h-0 w-full items-start justify-between gap-2">
          <h3
            className={`line-clamp-1 min-w-0 flex-1 overflow-hidden font-bold text-slate-900 ${isCompact ? 'text-[11px]' : 'text-[12px] md:text-[15px]'}`}
          >
            {store.name}
          </h3>
          {viewerLocationReady && distanceChipText !== null ? (
            <span
              className={distanceChipClass}
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
        <div className={`mt-0.5 flex items-center gap-1 text-slate-600 ${isCompact ? 'text-[7px]' : 'text-[10px] md:text-xs'}`}>
          <div className="flex items-center gap-0.5">{renderRatingStars(Number(store.rating) || 0)}</div>
          <span className="font-medium text-slate-700">{Number(store.rating || 0).toFixed(1)}</span>
          <span className="text-slate-500">({store.totalReviews})</span>
        </div>

        <div className={`space-y-1.5 ${isCompact ? 'mt-1' : 'mt-1.5 md:mt-2 md:space-y-2'}`}>
          <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className={`flex min-w-0 items-center gap-1.5 font-semibold text-slate-800 ${isCompact ? 'text-[8px]' : 'text-[12px] md:text-[13px]'}`}>
              <MapPin className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3 md:h-3.5 md:w-3.5'} shrink-0 text-slate-700`} />
              <span className="line-clamp-1 break-words text-left">{displayLocation}</span>
            </div>
            <div className={`flex min-w-0 items-center ${isCompact ? 'justify-start' : 'justify-end'} gap-1.5 font-semibold text-slate-800 ${isCompact ? 'text-[8px]' : 'text-[12px] md:text-[13px]'}`}>
              <Phone className={`${isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3 md:h-3.5 md:w-3.5'} shrink-0 text-slate-700`} />
              <span className="line-clamp-1 break-all text-right">{store.whatsapp || store.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className={`flex items-center ${isCompact ? 'justify-center text-center' : 'justify-end text-right'} gap-3 ${isCompact ? 'mt-1.5 mb-0.5' : 'mt-2.5 md:mt-3'}`}>
          {stats.map((item) => (
            <div key={item.label} className="min-w-[2.1rem]">
              <p className={`${isCompact ? 'text-[8px]' : 'text-[12px] md:text-[14px]'} font-bold leading-tight text-slate-900`}>{item.value}</p>
              <p className={`${isCompact ? 'text-[7px]' : 'text-[9px] md:text-[10px]'} leading-tight text-slate-500`}>{item.label}</p>
            </div>
          ))}
        </div>

        <div className={`${isCompact ? 'mt-1.5' : 'mt-2 border-t border-slate-200 pt-1.5 md:mt-2.5 md:pt-2'} grid grid-cols-1 gap-1.5`}>
          <span
            className={`inline-flex items-center justify-center rounded-lg bg-slate-800 font-medium text-white ${isCompact ? 'px-1 py-0.5 text-[7px]' : 'px-1 py-1 text-[10px] md:px-2 md:py-1.5 md:text-xs'}`}
          >
            Visit
          </span>
        </div>

      </div>
    </Link>
  );
}
