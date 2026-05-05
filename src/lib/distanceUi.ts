import { haversineKm, parseCoord } from '@/src/lib/geo';

/** Viewer coords from LocationContext — tolerates string lat/lng in persisted JSON. */
export function parseViewerLatLng(loc: { latitude?: unknown; longitude?: unknown } | null | undefined): {
  lat: number;
  lng: number;
} | null {
  if (!loc) return null;
  const lat = parseCoord(loc.latitude);
  const lng = parseCoord(loc.longitude);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

/** Tooltip for chips: straight-line from geocoded point, not driving distance. */
export const DISTANCE_CHIP_TITLE =
  'Straight-line km from your chosen location (map center for a city)—not driving distance. Nearby shops in the same city may still show a few km.';

export function formatKmDistanceLabel(km: number): string {
  const k = Math.max(0, km);
  if (!Number.isFinite(k)) return '—';
  if (k < 1) return '<1 km';
  if (k < 10) return `${k.toFixed(1)} km`;
  return `${Math.round(k)} km`;
}

/** Returns readable km label, or `null` when store coords are unavailable. */
export function viewerStoreDistanceKmLabel(
  viewerLat: number,
  viewerLng: number,
  storeLat: unknown,
  storeLng: unknown,
): string | null {
  const slat = parseCoord(storeLat);
  const slng = parseCoord(storeLng);
  if (slat == null || slng == null) return null;
  const km = haversineKm({ lat: viewerLat, lng: viewerLng }, { lat: slat, lng: slng });
  if (!Number.isFinite(km)) return null;
  return formatKmDistanceLabel(km);
}
