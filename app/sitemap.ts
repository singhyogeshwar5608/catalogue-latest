import type { MetadataRoute } from 'next';
import { fetchLocationLinksFromLaravel } from '@/lib/server/laravel-location-links';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;
const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://larawans.com';

type StoreLinkRow = {
  slug?: string | null;
  username?: string | null;
  updated_at?: string | null;
};

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

const MAX_SITEMAP_LINKS = 5000;

function normalizeStorePath(row: StoreLinkRow): string | null {
  const raw = String(row.username ?? row.slug ?? '').trim();
  if (!raw) return null;
  if (raw.includes('/') || raw.includes('?') || raw.includes('#')) return null;
  return raw;
}

async function fetchStoreLinks(): Promise<StoreLinkRow[]> {
  try {
    const res = await fetch(`${API_BASE.replace(/\/+$/, '')}/stores/internal-links`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[sitemap] stores/internal-links HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as ApiEnvelope<StoreLinkRow[]>;
    return Array.isArray(json?.data) ? json.data : [];
  } catch (error) {
    console.error('[sitemap] stores/internal-links request failed', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = SITE_URL.replace(/\/+$/, '');
  let stores: StoreLinkRow[] = [];
  let locations: Awaited<ReturnType<typeof fetchLocationLinksFromLaravel>> = [];

  try {
    stores = await fetchStoreLinks();
  } catch (error) {
    console.error('[sitemap] fetchStoreLinks failed', error);
    stores = [];
  }

  try {
    locations = await fetchLocationLinksFromLaravel();
  } catch (error) {
    console.error('[sitemap] fetchLocationLinksFromLaravel failed', error);
    locations = [];
  }

  console.info(`[sitemap] stores fetched: ${stores.length}`);
  console.info(`[sitemap] locations fetched: ${locations.length}`);

  const seen = new Set<string>();
  const urls: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  for (const store of stores) {
    if (urls.length >= MAX_SITEMAP_LINKS) break;
    const path = normalizeStorePath(store);
    if (!path) continue;
    const key = `/store/${path.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const parsedDate = store.updated_at ? new Date(store.updated_at) : undefined;
    const lastModified = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    urls.push({
      url: `${origin}/store/${encodeURIComponent(path)}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  for (const loc of locations) {
    if (urls.length >= MAX_SITEMAP_LINKS) break;
    const ss = (loc.state_slug ?? '').trim();
    const ds = (loc.district_slug ?? '').trim();
    if (!ss || !ds) continue;
    const key = `/stores/${ss.toLowerCase()}/${ds.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push({
      url: `${origin}/stores/${encodeURIComponent(ss)}/${encodeURIComponent(ds)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.65,
    });
  }

  return urls;
}
