/**
 * Fetches distinct state + district pairs from Laravel for sitemaps and crawlable hubs.
 */

import type { ApiEnvelope } from '@/src/lib/api-shared';
import { getServerLaravelApiBase } from '@/lib/server/laravel-stores';

export type LocationLinkRow = {
  state: string;
  district: string;
  store_count: number;
  state_slug: string;
  district_slug: string;
};

export async function fetchLocationLinksFromLaravel(): Promise<LocationLinkRow[]> {
  const base = getServerLaravelApiBase();
  try {
    const res = await fetch(`${base}/stores/location-links`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[sitemap] stores/location-links HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as ApiEnvelope<LocationLinkRow[]>;
    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    console.error('[sitemap] stores/location-links request failed', error);
    return [];
  }
}
