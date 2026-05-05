/**
 * Optional max age for public catalog keys in Upstash (stores/product proxies).
 * When unset, keys last until POST /api/cache/invalidate (recommended when Laravel NEXT_CACHE_INVALIDATE_URL is set).
 * Set e.g. 900 to limit staleness if DB is edited outside the app (admin SQL, etc.).
 */
export function getCatalogCacheTtlSeconds(): number | null {
  const raw = process.env.CATALOG_SAFETY_TTL_SECONDS?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return null;

  return n;
}
