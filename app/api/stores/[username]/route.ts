import { NextResponse } from 'next/server';
import { getCatalogCacheTtlSeconds } from '@/lib/catalogCacheTtl';
import { withCache } from '@/lib/withCache';
import { fetchStoreByUsernameFromLaravel } from '@/lib/server/laravel-stores';

/** No expiry by default; optional `CATALOG_SAFETY_TTL_SECONDS` in .env. */
const CACHE_TTL = getCatalogCacheTtlSeconds();

type RouteContext = { params: Promise<{ username: string }> };

/**
 * GET /api/stores/:username
 * Redis key: `stores:username:v6:<username>` (bump when busting bad entries / payload shape).
 */
export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;
  if (!username?.trim()) {
    return NextResponse.json({ success: false, message: 'Missing username' }, { status: 400 });
  }

  const key = username.trim();
  const cacheKey = `stores:username:v6:${key}`;

  try {
    const store = await withCache(
      cacheKey,
      () => fetchStoreByUsernameFromLaravel(key),
      CACHE_TTL,
      { skipSetIf: (row) => row === null },
    );

    if (!store) {
      return NextResponse.json({ success: false, message: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: store });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to load store';
    return NextResponse.json({ success: false, message }, { status: 502 });
  }
}
