/**
 * Global cache helpers — all Redis failures are swallowed so APIs never break.
 *
 * Restart the dev server after updating `.env` / `.env.local` (Upstash URL/token).
 *
 * TTL:
 * - Omit `ttlSeconds` (or pass `undefined` / `<= 0`) → default 5 minutes (`DEFAULT_CACHE_TTL_SECONDS`).
 * - Pass `null` → no EX on the key (data stays until you `deleteCache` / `deleteCacheByPattern` / e.g. after POST/PUT/DELETE).
 * - Values between 1 and 29 seconds are raised to 30 seconds (avoid ultra-short TTL noise).
 *
 * Catalog GET routes (`/api/stores`, `/api/products`, …) use `null` so Redis entries are only removed when
 * mutations invalidate them or `POST /api/cache/invalidate` runs — not because of time-based expiry.
 *
 * Verbose get/set logs: REDIS_DEBUG=1 (always logs a subset in development).
 */

import type { Redis } from '@upstash/redis';
import { getRedis } from '@/lib/redis';

/** Default TTL when none is passed (5 minutes). */
export const DEFAULT_CACHE_TTL_SECONDS = 300;

/** Do not use TTL shorter than this when EX is applied. */
const MIN_CACHE_TTL_SECONDS = 30;

/** Optional namespace; trailing `:` added if missing so keys are `prefix:logical`, not `prefixlogical`. */
function normalizeKeyPrefix(raw: string): string {
  const t = raw.trim();
  if (!t) return 'app:';
  return t.endsWith(':') ? t : `${t}:`;
}

const KEY_PREFIX = normalizeKeyPrefix(process.env.CACHE_KEY_PREFIX ?? 'app:');

function isCacheDebug(): boolean {
  return process.env.REDIS_DEBUG === '1' || process.env.NODE_ENV === 'development';
}

function isCacheVerbose(): boolean {
  return process.env.REDIS_DEBUG === '1';
}

function cacheLog(message: string, meta?: Record<string, unknown>): void {
  if (!isCacheDebug()) return;
  if (meta) console.log('[redis-cache]', message, meta);
  else console.log('[redis-cache]', message);
}

function cacheVerbose(message: string, meta?: Record<string, unknown>): void {
  if (!isCacheVerbose()) return;
  if (meta) console.log('[redis-cache]', message, meta);
  else console.log('[redis-cache]', message);
}

/**
 * Resolve how long to keep a key with EX.
 * @returns seconds for EX, or `null` to store without expiry.
 */
export function resolveCacheTtlSeconds(ttlSeconds?: number | null): number | null {
  if (ttlSeconds === null) return null;
  if (ttlSeconds === undefined || ttlSeconds <= 0) return DEFAULT_CACHE_TTL_SECONDS;
  if (ttlSeconds < MIN_CACHE_TTL_SECONDS) return MIN_CACHE_TTL_SECONDS;
  return ttlSeconds;
}

/** Normalize logical keys like `products:list` → stored key `app:products:list`. */
export function buildCacheKey(logicalKey: string): string {
  const k = logicalKey.trim();
  if (!k) return KEY_PREFIX;
  return k.startsWith(KEY_PREFIX) ? k : `${KEY_PREFIX}${k}`;
}

/** Delete keys in chunks (Redis variadic DEL limits / payload size). */
const DEL_CHUNK = 250;

async function delChunked(redis: Redis, keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += DEL_CHUNK) {
    const slice = keys.slice(i, i + DEL_CHUNK);
    if (slice.length === 0) continue;
    try {
      await redis.del(...slice);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Read cached JSON. Returns `undefined` if miss, Redis off, or error.
 * (Distinguishes miss from stored JSON `null`.)
 */
export async function getCache<T>(key: string): Promise<T | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;

  const full = buildCacheKey(key);
  try {
    const raw = await redis.get<string | T>(full);
    if (raw === null || raw === undefined) {
      cacheVerbose('get miss', { key: full });
      return undefined;
    }
    cacheVerbose('get hit', { key: full });
    return raw as T;
  } catch (e) {
    console.warn('[redis-cache] get error', {
      key: full,
      error: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
}

/**
 * Write value (JSON-serializable).
 * @param ttlSeconds `undefined` or `<= 0` → default {@link DEFAULT_CACHE_TTL_SECONDS}.
 *        `null` → no expiry (key stays until deleted).
 */
export async function setCache(key: string, data: unknown, ttlSeconds?: number | null): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const full = buildCacheKey(key);
  const ex = resolveCacheTtlSeconds(ttlSeconds);

  try {
    cacheLog('set start', { key: full, exSeconds: ex, ttlInput: ttlSeconds ?? '(default)' });
    if (ex != null) {
      await redis.set(full, data, { ex });
    } else {
      await redis.set(full, data);
    }
    let ttlRemaining: number | null = null;
    if (isCacheDebug()) {
      try {
        ttlRemaining = await redis.ttl(full);
      } catch {
        /* optional */
      }
    }
    cacheLog('set done', { key: full, exSeconds: ex, ttlRemaining });
  } catch (e) {
    console.warn('[redis-cache] set error', {
      key: full,
      exSeconds: ex,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Remove a single key. */
export async function deleteCache(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(buildCacheKey(key));
  } catch {
    /* ignore */
  }
}

/**
 * Invalidate all keys matching a Redis glob-style pattern (after prefix).
 * Examples: `products:*`, `users:list*`
 *
 * Uses KEYS + batched DEL. For very large keyspaces, prefer versioned keys or a
 * dedicated index set instead of broad pattern deletes.
 */
export async function deleteCacheByPattern(pattern: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  const match = buildCacheKey(pattern.replace(/^\s+/, ''));

  try {
    const keys = (await redis.keys(match)) as string[];
    if (!keys?.length) return 0;
    await delChunked(redis, keys);
    return keys.length;
  } catch {
    return 0;
  }
}

/** Invalidate every key for a resource segment, e.g. `products` → `products:*`. */
export async function invalidateResource(resourceName: string): Promise<number> {
  const name = resourceName.replace(/^:+|:+$/g, '').trim();
  if (!name) return 0;
  return deleteCacheByPattern(`${name}:*`);
}
