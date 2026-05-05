import { parseCoord } from '@/src/lib/geo';

type WithStoreCoords = { storeLatitude?: number | null; storeLongitude?: number | null };

/**
 * Copies parent store latitude/longitude onto listing rows when missing (store-scoped `/products/:id`
 * responses don't embed real store coords — only `store_id`).
 */
export function hydrateListingStoreCoords<T extends WithStoreCoords>(
  items: T[],
  store: { latitude?: unknown; longitude?: unknown } | null | undefined,
): T[] {
  if (!items.length || !store) return items;

  const lat = parseCoord(store.latitude);
  const lng = parseCoord(store.longitude);
  if (lat == null || lng == null) return items;

  return items.map((item) => {
    const hasCoords =
      typeof item.storeLatitude === 'number' && typeof item.storeLongitude === 'number';
    if (hasCoords) return item;
    return { ...item, storeLatitude: lat, storeLongitude: lng };
  });
}
