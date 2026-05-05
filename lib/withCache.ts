/**
 * Cache-aside wrapper: try Redis → on miss run fetcher → set → return.
 * Redis errors never propagate; fetcher always drives the successful path.
 */

import { deleteCache, getCache, setCache } from '@/lib/cache';

export type CacheFetcher<T> = () => Promise<T>;

export type WithCacheOptions<T> = {
  /**
   * When true:
   * - After fetch: skip SET (e.g. do not cache `null` misses or empty lists with infinite TTL).
   * - On read: if a cached value still matches, treat it as stale — delete the key and refetch
   *   (fixes permanently cached `[]` after a transient upstream failure).
   */
  skipSetIf?: (value: T) => boolean;
};

/**
 * @param cacheKey Logical key, e.g. `products:list` or `products:123`
 * @param fetcher Async loader (DB, HTTP, etc.)
 * @param ttlSeconds TTL in seconds: omit or `<= 0` → default 5 minutes (see `DEFAULT_CACHE_TTL_SECONDS`).
 *        Pass `null` for no EX — key stays until explicit invalidation (POST/PUT/DELETE or `/api/cache/invalidate`).
 */
export async function withCache<T>(
  cacheKey: string,
  fetcher: CacheFetcher<T>,
  ttlSeconds?: number | null,
  options?: WithCacheOptions<T>,
): Promise<T> {
  try {
    const cached = await getCache<T>(cacheKey);
    if (cached !== undefined) {
      const treatAsStale = options?.skipSetIf?.(cached) ?? false;
      if (treatAsStale) {
        try {
          await deleteCache(cacheKey);
        } catch {
          /* ignore */
        }
      } else {
        return cached;
      }
    }
  } catch {
    /* fall through to fetcher */
  }

  const fresh = await fetcher();

  const skip = options?.skipSetIf?.(fresh) ?? false;
  if (!skip) {
    try {
      await setCache(cacheKey, fresh, ttlSeconds);
    } catch {
      /* ignore — response still returns fresh */
    }
  }

  return fresh;
}
