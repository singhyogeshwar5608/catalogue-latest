import { NextResponse } from 'next/server';
import { buildCacheKey } from '@/lib/cache';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const TTL_DEBUG_SECONDS = 60;
const RE_FETCH_DELAY_MS = 2500;

/**
 * GET /api/redis-test
 * Writes two keys (prefix is normalized with a trailing `:` — e.g. `catelog:debug:test`).
 * In Upstash Data Browser, search `*` or your prefix; catalog keys appear after browsing
 * the site because lists use GET `/api/stores` (Redis), not direct Laravel calls.
 *
 * Restart `next dev` after changing `.env` so Upstash URL/token reload.
 */
export async function GET() {
  const redis = getRedis();
  const urlRaw = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '').trim();
  const hasToken = Boolean(
    (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '').trim(),
  );

  if (!redis) {
    console.warn('[redis-test] No client — check UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
    return NextResponse.json(
      {
        ok: false,
        noTTL: null,
        ttlValue: null,
        message: 'Redis client not configured',
        redisConfigured: Boolean(urlRaw && hasToken),
        hint: 'Set env vars and restart the dev server.',
      },
      { status: 503 },
    );
  }

  const keyNoTtl = buildCacheKey('debug:test');
  const keyTtl = buildCacheKey('debug:ttl');
  const logs: string[] = [];

  const push = (line: string) => {
    logs.push(line);
    console.log(`[redis-test] ${line}`);
  };

  try {
    push(`SET ${keyNoTtl} = "working" (no EX)`);
    await redis.set(keyNoTtl, 'working');

    push(`SET ${keyTtl} = "ttl_test" EX ${TTL_DEBUG_SECONDS}`);
    await redis.set(keyTtl, 'ttl_test', { ex: TTL_DEBUG_SECONDS });

    const noTTL = await redis.get(keyNoTtl);
    const ttlValue = await redis.get(keyTtl);
    push(`GET after set — noTTL=${String(noTTL)}, ttlValue=${String(ttlValue)}`);

    let ttlRemainingInitial: number | null = null;
    try {
      ttlRemainingInitial = await redis.ttl(keyTtl);
      push(`TTL ${keyTtl} immediately = ${ttlRemainingInitial} (-1=no expiry, -2=missing)`);
    } catch (e) {
      push(`TTL read error: ${e instanceof Error ? e.message : String(e)}`);
    }

    push(`Waiting ${RE_FETCH_DELAY_MS}ms then re-read TTL key…`);
    await new Promise((r) => setTimeout(r, RE_FETCH_DELAY_MS));

    let ttlAfterDelay: number | null = null;
    let ttlValueAfterDelay: string | null = null;
    try {
      ttlAfterDelay = await redis.ttl(keyTtl);
      ttlValueAfterDelay = (await redis.get(keyTtl)) as string | null;
      push(
        `After delay — TTL=${ttlAfterDelay}, value=${String(ttlValueAfterDelay)} (TTL should be ~${TTL_DEBUG_SECONDS - Math.ceil(RE_FETCH_DELAY_MS / 1000)}s lower)`,
      );
    } catch (e) {
      push(`Re-fetch error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({
      ok: true,
      noTTL,
      ttlValue,
      message: 'Redis test complete',
      storageKeys: { noExpiry: keyNoTtl, withTtl: keyTtl },
      ttlSecondsApplied: TTL_DEBUG_SECONDS,
      ttlRemainingInitial,
      ttlAfterDelayMs: ttlAfterDelay,
      ttlValueAfterDelay,
      logs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    console.error('[redis-test]', msg, e);
    return NextResponse.json(
      {
        ok: false,
        noTTL: null,
        ttlValue: null,
        message: `Redis test failed: ${msg}`,
        logs,
      },
      { status: 500 },
    );
  }
}
