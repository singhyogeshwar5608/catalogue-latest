/**
 * Upstash Redis (HTTP/REST) — safe for Vercel / serverless (no TCP).
 *
 * Env (see https://console.upstash.com):
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * Also supports Vercel KV fallbacks used by `Redis.fromEnv()`.
 *
 * Restart the dev server after changing `.env` / `.env.local` so `process.env` reloads.
 * Client is recreated when URL/token pair changes so adding env after `next dev`
 * start (or "Reload env") still picks up credentials — avoids a stuck `null` client.
 *
 * Verbose connection logs: set REDIS_DEBUG=1
 */

import { Redis } from '@upstash/redis';

let cachedClient: Redis | null = null;
let cachedEnvKey = '';
let warnedMissingCredentials = false;

function isRedisDebug(): boolean {
  return process.env.REDIS_DEBUG === '1' || process.env.NODE_ENV === 'development';
}

function readCredentials(): { url: string; token: string } {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '').trim();
  return { url, token };
}

function createRedis(url: string, token: string): Redis | null {
  try {
    return new Redis({ url, token });
  } catch (e) {
    console.warn('[redis] Failed to initialize Redis client:', e);
    return null;
  }
}

export function getRedis(): Redis | null {
  const { url, token } = readCredentials();
  const envKey = `${url}|${token.length}`;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'development' && !warnedMissingCredentials) {
      warnedMissingCredentials = true;
      console.warn(
        '[redis] Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — caching disabled.',
      );
    }
    cachedClient = null;
    cachedEnvKey = '';
    return null;
  }

  warnedMissingCredentials = false;

  if (cachedClient && cachedEnvKey === envKey) {
    return cachedClient;
  }

  const client = createRedis(url, token);
  cachedClient = client;
  cachedEnvKey = envKey;
  if (!client) {
    cachedEnvKey = '';
  } else if (isRedisDebug()) {
    let host = '(invalid-url)';
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep placeholder */
    }
    console.log('[redis] Client ready (Upstash REST)', { host, tokenLength: token.length });
  }
  return client;
}

/** Reset client (tests / forced re-init). */
export function resetRedisForTests(): void {
  cachedClient = null;
  cachedEnvKey = '';
}
