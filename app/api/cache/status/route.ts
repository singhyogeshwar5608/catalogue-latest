import { NextResponse } from 'next/server';
import { buildCacheKey } from '@/lib/cache';
import { getRedis } from '@/lib/redis';

/**
 * GET /api/cache/status
 * Safe diagnostics (no secrets). Use to verify Upstash wiring.
 */
export async function GET() {
  const urlRaw = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '').trim();
  const hasToken = Boolean(
    (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '').trim(),
  );

  let urlHost: string | null = null;
  try {
    urlHost = urlRaw ? new URL(urlRaw).hostname : null;
  } catch {
    urlHost = null;
  }

  const redis = getRedis();
  let ping: string | null = null;
  let writeTest = false;
  let writeError: string | null = null;

  if (redis) {
    try {
      ping = String(await redis.ping());
    } catch (e) {
      ping = `error: ${e instanceof Error ? e.message : 'unknown'}`;
    }

    const probeKey = buildCacheKey('__cache_probe__');
    try {
      await redis.set(probeKey, { at: Date.now() }, { ex: 30 });
      const readBack = await redis.get(probeKey);
      writeTest = readBack != null;
      await redis.del(probeKey);
    } catch (e) {
      writeTest = false;
      writeError = e instanceof Error ? e.message : 'write failed';
    }
  }

  return NextResponse.json({
    ok: Boolean(redis && String(ping).toUpperCase() === 'PONG' && writeTest),
    redisConfigured: Boolean(urlRaw && hasToken),
    redisClientActive: redis != null,
    urlHost,
    ping,
    writeTest,
    writeError,
    keyPrefix: process.env.CACHE_KEY_PREFIX ?? 'app:',
    note:
      'Catalog routes may cache under PREFIX:stores:*, PREFIX:products:*, PREFIX:users:* (see /api/cache/invalidate scopes). ' +
      'Legacy flows that call Laravel directly from the browser do not write to this Redis.',
  });
}
