/**
 * Client / server fallback for inferring trial end when Laravel omits `trial_ends_at`.
 * Authoritative value lives in `platform_settings.free_trial_days` (see Laravel `PlatformSetting`).
 * Prefetch from `GET .../utils/free-trial-days` when possible (see `prefetchFreeTrialDays`).
 */

import type { Store } from '@/types';

/** Keep aligned with `App\Models\PlatformSetting::DEFAULT_FREE_TRIAL_DAYS`. */
export const DEFAULT_FREE_TRIAL_DAYS = 5;

function parseTrialEndMs(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Ensures `trialEndsAt` is set when the API / Redis cache omitted it (uses `createdAt` + free-trial days). */
export function ensureStoreTrialEndsAt(store: Store): Store {
  if (parseTrialEndMs(store.trialEndsAt) != null) return store;
  if (!store.createdAt) return store;
  const iso = trialEndsAtFallbackFromCreated(store.createdAt);
  if (!iso) return store;
  return { ...store, trialEndsAt: iso };
}

let cachedDays: number | null = null;
let inflight: Promise<number> | null = null;

export function setFreeTrialDaysClientCache(days: number): void {
  const n = Math.trunc(Number(days));
  cachedDays = Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_TRIAL_DAYS;
}

export function getFreeTrialDaysForClientFallback(): number {
  return cachedDays ?? DEFAULT_FREE_TRIAL_DAYS;
}

export function trialFallbackMsFromDays(days: number): number {
  const d = Math.max(1, Math.trunc(Number(days)));
  return d * 24 * 60 * 60 * 1000;
}

export function trialEndsAtFallbackFromCreated(createdAtIso: string): string | null {
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + trialFallbackMsFromDays(getFreeTrialDaysForClientFallback())).toISOString();
}

/**
 * Fetches public `utils/free-trial-days` once (per process in Node, per session in browser after first call).
 * `apiBaseUrl` must be the Laravel JSON root (e.g. `https://host/api/v1/v1` or dev proxy `http://localhost:3000/api/laravel`).
 */
export function clearFreeTrialDaysClientCache(): void {
  cachedDays = null;
  inflight = null;
}

export async function prefetchFreeTrialDays(
  apiBaseUrl: string,
  options?: { force?: boolean }
): Promise<number> {
  if (options?.force) {
    clearFreeTrialDaysClientCache();
  }
  if (cachedDays !== null) return cachedDays;
  if (!inflight) {
    const base = apiBaseUrl.replace(/\/+$/, '');
    inflight = (async () => {
      try {
        const res = await fetch(`${base}/utils/free-trial-days`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) return DEFAULT_FREE_TRIAL_DAYS;
        const body = (await res.json()) as { data?: { free_trial_days?: unknown } };
        const raw = body?.data?.free_trial_days;
        const n = Math.trunc(Number(raw));
        const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_TRIAL_DAYS;
        cachedDays = days;
        return days;
      } catch {
        return DEFAULT_FREE_TRIAL_DAYS;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}
