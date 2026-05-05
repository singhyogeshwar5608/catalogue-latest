'use client';

export type CatalogCacheScope = 'stores' | 'products' | 'users';

/**
 * Purges Next.js Redis keys for the given scopes (same-origin POST /api/cache/invalidate).
 *
 * - **Development** / no secret: Next allows unauthenticated invalidation.
 * - **Production** with `CACHE_INVALIDATE_SECRET`: use Laravel `NEXT_CACHE_INVALIDATE_URL` + secret
 *   (see `App\Support\NextCatalogCacheInvalidate`).
 */
export async function purgeCatalogCacheClient(scopes: CatalogCacheScope[]): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!scopes.length) return;
  try {
    await fetch(`${window.location.origin}/api/cache/invalidate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scopes }),
      credentials: 'same-origin',
    });
  } catch {
    /* non-fatal */
  }
}

/** Purges Redis keys matching `stores:*`. */
export async function purgeStoresCatalogCacheClient(): Promise<void> {
  return purgeCatalogCacheClient(['stores']);
}

/** Purges Redis keys matching `products:*`. */
export async function purgeProductsCatalogCacheClient(): Promise<void> {
  return purgeCatalogCacheClient(['products']);
}

/** Purges Redis keys matching `users:*`. */
export async function purgeUsersCatalogCacheClient(): Promise<void> {
  return purgeCatalogCacheClient(['users']);
}
