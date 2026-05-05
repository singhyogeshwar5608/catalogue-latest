import type { Store } from '@/types';

const INDIA_RE = /^india$/i;

function splitLocationParts(raw: string): string[] {
  return raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !INDIA_RE.test(p));
}

/**
 * Card-friendly area line: prefer `district` + `state` from the API; otherwise take the last two
 * comma-separated segments of `location` (drops village/locality prefixes like "Ahirka, Jind, Haryana" → "Jind, Haryana").
 */
export function formatStoreDistrictState(store: Pick<Store, 'district' | 'state' | 'location'>): string {
  const district = store.district?.trim();
  const state = store.state?.trim();
  if (district && state) return `${district}, ${state}`;
  if (district) return district;
  if (state) return state;

  const raw = (store.location ?? '').trim();
  if (!raw) return 'Location unavailable';

  const parts = splitLocationParts(raw);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  return parts[0] ?? raw;
}
