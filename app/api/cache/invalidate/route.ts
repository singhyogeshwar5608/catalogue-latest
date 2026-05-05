import { NextResponse } from 'next/server';
import { deleteCacheByPattern } from '@/lib/cache';

type Scope = 'stores' | 'products' | 'users';

function isAuthorized(request: Request): boolean {
  const secret = process.env.CACHE_INVALIDATE_SECRET?.trim();
  const provided = request.headers.get('x-cache-invalidate-secret')?.trim();

  if (process.env.NODE_ENV === 'production') {
    return Boolean(secret && provided === secret);
  }
  // Non-production: browser `catalogCacheClient` has no way to pass CACHE_INVALIDATE_SECRET without
  // leaking it (never use NEXT_PUBLIC_* for this). Allow POST without the header in dev.
  return true;
}

/**
 * GET — does not clear cache. Use so you can open this URL in a browser and see that the right **Next**
 * deployment is hit (not Laravel `/api/v1/v1/...`). Real purge: POST only.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message:
        'This is the Next.js cache invalidate endpoint. Clear cache with POST (see POST handler). Do not use Laravel paths like /api/v1/v1/cache/invalidate.',
    },
    { status: 200 },
  );
}

/**
 * POST /api/cache/invalidate
 * Clears Redis catalog keys so the next GET refetches Laravel / origin.
 *
 * Header (recommended in production): `x-cache-invalidate-secret: <CACHE_INVALIDATE_SECRET>`
 * Body (optional JSON): `{ "scopes": ["stores"] }` — default `stores`, `products`, and `users`.
 *
 * Call this from Laravel after store/product/user-affecting mutations (HTTP), or from CI, so cache is not
 * time-expired only invalidated on writes.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let scopes: Scope[] = ['stores', 'products', 'users'];
  try {
    const body = (await request.json().catch(() => null)) as { scopes?: unknown } | null;
    if (body?.scopes && Array.isArray(body.scopes)) {
      const next = body.scopes.filter(
        (s): s is Scope => s === 'stores' || s === 'products' || s === 'users',
      );
      if (next.length > 0) scopes = next;
    }
  } catch {
    /* keep default */
  }

  const deleted: Record<string, number> = {};
  if (scopes.includes('stores')) {
    deleted.stores = await deleteCacheByPattern('stores:*');
  }
  if (scopes.includes('products')) {
    deleted.products = await deleteCacheByPattern('products:*');
  }
  if (scopes.includes('users')) {
    deleted.users = await deleteCacheByPattern('users:*');
  }

  return NextResponse.json({ ok: true, deleted, scopes });
}
