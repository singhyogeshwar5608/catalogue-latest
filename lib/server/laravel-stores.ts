/**
 * Server-only fetch helpers for Laravel store endpoints (no `use client`).
 * Used by `/api/stores` so Redis can wrap responses.
 */

import type { Store } from '@/types';
import {
  normalizeStore,
  type ApiEnvelope,
  type BackendStore,
} from '@/src/lib/api-shared';
import { prefetchFreeTrialDays } from '@/src/lib/freeTrialDays';

const LIVE_API_BASE = `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

/** Public Laravel route prefix in this project (`bootstrap/app.php`). */
function ensureApiV1V1Path(raw: string): string {
  const u = raw.replace(/\/+$/, '');
  if (/\/api\/v1\/v1$/i.test(u)) return u;
  if (/\/api\/v1$/i.test(u)) return `${u}/v1`;
  return `${u}/api/v1/v1`;
}

/**
 * Base URL for **server** fetches (RSC, `GET /api/stores` route, etc.). Must be the real PHP / Laravel
 * public origin, **not** the Next-only site if the apex domain in DNS points to Vercel/Node.
 *
 * Use `LARAVEL_SSR_BASE_URL` (e.g. `https://api.larawans.com`) when Laravel lives on a subdomain; keep
 * `NEXT_PUBLIC_BASE_URL` as the **marketing** site (`https://larawans.com`) if that serves Next.
 */
export function getServerLaravelApiBase(): string {
  const ssr = process.env.LARAVEL_SSR_BASE_URL?.trim();
  if (ssr) {
    return ensureApiV1V1Path(ssr);
  }
  const fromEnv = process.env.LARAVEL_API_BASE_URL?.trim();
  if (fromEnv) {
    return ensureApiV1V1Path(fromEnv);
  }
  const proxy = process.env.BACKEND_PROXY_TARGET?.trim();
  if (proxy) {
    return ensureApiV1V1Path(proxy);
  }
  const v = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (v && v.length > 0) {
    return ensureApiV1V1Path(v);
  }
  return LIVE_API_BASE;
}

function isProbablyNextHtmlError(body: string): boolean {
  const t = body.slice(0, 400).toLowerCase();
  return t.includes('<!doctype') || t.includes('__next') || t.includes('next.js');
}

function parseStoreListPayload(raw: unknown): BackendStore[] {
  if (Array.isArray(raw)) return raw as BackendStore[];
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: BackendStore[] }).data;
  }
  return [];
}

/** GET /stores?… — same query shape as {@link getAllStores} in `src/lib/api.ts`. */
export async function fetchStoresFromLaravel(queryString: string): Promise<Store[]> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const path = queryString ? `/stores?${queryString}` : '/stores';
  const url = `${base}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Laravel unreachable (${url}): ${msg}. ` +
        'If you used api.larawans.com but DNS is not ready, use local PHP: LARAVEL_SSR_BASE_URL=http://127.0.0.1:8000 ' +
        'and run `cd backend && php artisan serve`. Or create the api subdomain in Hostinger first.'
    );
  }

  const text = await res.text().catch(() => '');

  if (!res.ok) {
    if (isProbablyNextHtmlError(text)) {
      throw new Error(
        'Laravel store list: got a Next.js HTML page — this URL is the Next app, not PHP. ' +
          'In Hostinger, add a subdomain (e.g. api.larawans.com) with document root = Laravel /public, ' +
          'then in .env set the same for server + client: ' +
          'LARAVEL_SSR_BASE_URL=https://api.larawans.com, NEXT_PUBLIC_API_BASE_URL=https://api.larawans.com/api/v1/v1, ' +
          'BACKEND_PROXY_TARGET=https://api.larawans.com. Local: LARAVEL_SSR_BASE_URL=http://127.0.0.1:8000. ' +
          'Current base: ' +
          base
      );
    }
    throw new Error(`Stores upstream HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  let envelope: ApiEnvelope<BackendStore[]>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<BackendStore[]>;
  } catch {
    if (isProbablyNextHtmlError(text)) {
      throw new Error(
        'Laravel store list: response was HTML, not JSON. Set LARAVEL_SSR_BASE_URL to your Laravel host (e.g. https://api.larawans.com). Base used: ' +
          base
      );
    }
    throw new Error('Laravel store list: upstream is not valid JSON.');
  }
  const rows = parseStoreListPayload(envelope.data);
  return rows.map(normalizeStore);
}

/** GET /store/{username} — public store payload. */
export async function fetchStoreByUsernameFromLaravel(username: string): Promise<Store | null> {
  const base = getServerLaravelApiBase();
  await prefetchFreeTrialDays(base);
  const url = `${base}/store/${encodeURIComponent(username)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Laravel unreachable (${url}): ${msg}. Run \`php artisan serve\` in /backend or fix LARAVEL_SSR_BASE_URL.`);
  }

  const text = await res.text().catch(() => '');

  if (res.status === 404) return null;

  if (!res.ok) {
    if (isProbablyNextHtmlError(text)) {
      throw new Error(
        'Laravel store: Next.js HTML (wrong upstream). Set LARAVEL_SSR_BASE_URL to your PHP API host (e.g. https://api.larawans.com). Base: ' +
          base
      );
    }
    throw new Error(`Store upstream HTTP ${res.status}: ${text.slice(0, 240)}`);
  }

  let envelope: ApiEnvelope<BackendStore>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<BackendStore>;
  } catch {
    if (isProbablyNextHtmlError(text)) {
      throw new Error('Laravel store: HTML instead of JSON. Set LARAVEL_SSR_BASE_URL. Base: ' + base);
    }
    throw new Error('Laravel store: upstream is not valid JSON.');
  }
  const data = envelope.data;
  if (!data || typeof data !== 'object') return null;
  return normalizeStore(data);
}
