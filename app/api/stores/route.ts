import { NextResponse } from 'next/server';
import { getCatalogCacheTtlSeconds } from '@/lib/catalogCacheTtl';
import { withCache } from '@/lib/withCache';
import { fetchStoresFromLaravel } from '@/lib/server/laravel-stores';

/** No expiry by default; optional `CATALOG_SAFETY_TTL_SECONDS` in .env. */
const CACHE_TTL = getCatalogCacheTtlSeconds();

/**
 * GET /api/stores?search=&category=&location=&state=&district=&only_verified=1&only_boosted=1&limit=&lat=&lng=&radius_km=&include_inactive=1
 * Proxies Laravel `/stores` and caches in Redis as `stores:list:v6?<query>` (v6: listing includes `category.banner_images` for cards).
 * `state` + `district` filter active stores for SEO location hubs (see `app/stores/[state]/[district]/page.tsx`).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();
    const cacheKey = `stores:list:v6?${qs || '_'}`;

    const stores = await withCache(
      cacheKey,
      () => fetchStoresFromLaravel(qs),
      CACHE_TTL,
      {
        skipSetIf: (rows) => !Array.isArray(rows) || rows.length === 0,
      },
    );

    return NextResponse.json({ success: true, data: stores });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load stores';
    return NextResponse.json({ success: false, message, data: [] }, { status: 502 });
  }
}
