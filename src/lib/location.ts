'use client';

const LOCATION_STORAGE_KEY = 'catelog-location';
const NOMINATIM_EMAIL = process.env.NEXT_PUBLIC_NOMINATIM_EMAIL ?? 'support@catelog.app';

const buildNominatimUrl = (path: 'search' | 'reverse', params: Record<string, string | number>) => {
  const searchParams = new URLSearchParams({
    ...Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {}),
    email: NOMINATIM_EMAIL,
  });
  return `https://nominatim.openstreetmap.org/${path}?${searchParams.toString()}`;
};

type LocationSource = 'ip' | 'browser' | 'manual';

export type StoredLocation = {
  label: string;
  latitude: number;
  longitude: number;
  source: LocationSource;
  updatedAt: string;
  /** India/OSM-style district (e.g. county/state_district) — shown in navbar chip when present. */
  district?: string;
};

export type PinLookupResult = {
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  locality?: string;
};

export const lookupPinCode = async (pinCode: string): Promise<PinLookupResult | null> => {
  const normalized = pinCode.replace(/[^0-9]/g, '').slice(0, 6);
  if (!/^[0-9]{6}$/.test(normalized)) {
    return null;
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`);
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Array<{
      Status?: string;
      PostOffice?: Array<{
        Name?: string;
        District?: string;
        State?: string;
        Block?: string;
        Division?: string;
        Region?: string;
        Circle?: string;
        Country?: string;
      }>;
    }>;
    const entry = payload?.[0];
    if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) {
      return null;
    }
    const office = entry.PostOffice[0];
    return {
      city: office.Block || office.Division || office.Region || office.District,
      district: office.District || office.Region || office.Circle,
      state: office.State,
      country: office.Country,
      locality: office.Name,
    } satisfies PinLookupResult;
  } catch (error) {
    console.warn('PIN lookup failed', error);
    return null;
  }
};

export type LocationSuggestion = {
  label: string;
  city: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
};

const isBrowser = () => typeof window !== 'undefined';

export const loadStoredLocation = (): StoredLocation | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    const latitude = Number(parsed.latitude);
    const longitude = Number(parsed.longitude);
    if (
      typeof parsed.label === 'string' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      return { ...parsed, latitude, longitude };
    }
  } catch (error) {
    console.warn('Unable to parse stored location', error);
  }
  return null;
};

export const persistStoredLocation = (value: StoredLocation | null) => {
  if (!isBrowser()) return;
  try {
    if (!value) {
      window.localStorage.removeItem(LOCATION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('Unable to persist stored location', error);
  }
};

export const fetchIpLocation = async (): Promise<StoredLocation | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    const label = data.city || data.region || data.country_name || 'India';
    return {
      label,
      latitude,
      longitude,
      source: 'ip',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('IP geolocation failed', error);
    return null;
  }
};

/** Narrow free-text geocode to India unless the query clearly names another country (marketplace default). */
const shouldBiasGeocodeToIndia = (query: string) => {
  const t = query.trim();
  if (!t) return false;
  return !/\b(india|pakistan|bangladesh|nepal|usa|u\.s\.|united states|uk|united kingdom|canada|australia|uae|dubai|china|japan|germany|france|spain|italy)\b/i.test(t);
};

const nominatimImportance = (row: { importance?: number; class?: string; type?: string }) => {
  let s = row.importance ?? 0;
  if (row.class === 'place' && row.type && ['city', 'town', 'village', 'municipality', 'suburb'].includes(row.type)) {
    s += 0.25;
  }
  return s;
};

export const geocodePlace = async (
  query: string,
): Promise<{ label: string; latitude: number; longitude: number; district?: string } | null> => {
  if (!query.trim()) return null;
  const trimmed = query.trim();
  const biased = shouldBiasGeocodeToIndia(trimmed);
  const q = biased && !/,\s*India\b/i.test(trimmed) ? `${trimmed}, India` : trimmed;
  const url = buildNominatimUrl('search', {
    format: 'json',
    q,
    limit: 8,
    addressdetails: 1,
    ...(biased ? { countrycodes: 'in' } : {}),
  });
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const results = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
      importance?: number;
      class?: string;
      type?: string;
    }>;
    const rows = Array.isArray(results) ? results : [];
    if (!rows.length) {
      return null;
    }
    const match = [...rows].sort((a, b) => nominatimImportance(b) - nominatimImportance(a))[0];
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    const city = normalizeCityName(match.address, match.display_name.split(',')[0]?.trim() ?? trimmed);
    const districtRaw = normalizeDistrictName(match.address);
    const state = match.address?.state || match.address?.region;
    const label = state ? `${city}, ${state}` : city;
    return {
      label,
      latitude,
      longitude,
      ...(districtRaw ? { district: districtRaw } : {}),
    };
  } catch (error) {
    console.warn('Geocoding failed', error);
    return null;
  }
};

export type ReverseGeocodeDetails = {
  label: string;
  district?: string;
};

/** Full reverse-geocode payload; prefer {@link StoredLocation.district} for header chip labels. */
export const reverseGeocodeDetails = async (latitude: number, longitude: number): Promise<ReverseGeocodeDetails | null> => {
  const url = buildNominatimUrl('reverse', {
    format: 'json',
    lat: latitude,
    lon: longitude,
    addressdetails: 1,
  });
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { address?: Record<string, string>; display_name?: string };
    const address = data?.address as Record<string, string> | undefined;
    if (address) {
      const district = (normalizeDistrictName(address) ?? '').trim();

      const { city, town, village, state, municipality, county } = address;
      // Prefer settlement name for label; county often duplicates district in India — avoid using county as "city".
      const locality =
        city || town || village || municipality || (district ? '' : county) || normalizeCityName(address, '').trim();

      const displayLead = locality || district || data.display_name?.split(',')[0]?.trim() || '';

      const label =
        displayLead && state ? `${displayLead}, ${state}` : displayLead || data.display_name?.trim() || '';

      if (label) {
        return {
          label,
          district: district || undefined,
        };
      }
    }

    const fallback = data?.display_name?.trim();
    return fallback ? { label: fallback } : null;
  } catch (error) {
    console.warn('Reverse geocoding failed', error);
    return null;
  }
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  const detailed = await reverseGeocodeDetails(latitude, longitude);
  return detailed?.label ?? null;
};

const normalizeCityName = (address: Record<string, string> | undefined, fallback: string) => {
  if (!address) return fallback;
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.suburb ||
    address.county ||
    fallback
  );
};

const normalizeDistrictName = (address: Record<string, string> | undefined) => {
  if (!address) return undefined;
  return address.county || address.state_district || address.city_district || address.suburb;
};

export const searchLocations = async (query: string, limit = 5, signal?: AbortSignal): Promise<LocationSuggestion[]> => {
  if (!query.trim()) return [];
  const trim = query.trim();
  const url = buildNominatimUrl('search', {
    format: 'json',
    addressdetails: 1,
    limit,
    q: trim,
    ...(shouldBiasGeocodeToIndia(trim) ? { countrycodes: 'in' } : {}),
  });
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
    if (!response.ok) {
      return [];
    }
    const raw = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
      importance?: number;
      class?: string;
      type?: string;
    }>;

    const results = (Array.isArray(raw) ? [...raw] : []).sort(
      (a, b) => nominatimImportance(b) - nominatimImportance(a),
    );

    return results
      .map((result) => {
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);
        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return null;
        }
        const city = normalizeCityName(result.address, result.display_name.split(',')[0]?.trim() ?? query);
        const district = normalizeDistrictName(result.address);
        const state = result.address?.state ?? result.address?.region;
        const suggestion: LocationSuggestion = {
          label: result.display_name,
          city,
          district,
          state,
          latitude,
          longitude,
        };
        return suggestion;
      })
      .filter((value): value is LocationSuggestion => Boolean(value));
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      return [];
    }
    console.warn('Location suggestions failed', error);
    return [];
  }
};

export type LocationStateSnapshot = {
  label: string;
  latitude: number;
  longitude: number;
  source: LocationSource;
};

export const extractCityTokens = (label?: string | null): string[] => {
  if (!label) return [];
  return label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
};

export const removeSectorTokens = (tokens: string[]) => tokens.filter((token) => !/sector/i.test(token));

export const dedupeTokens = (tokens: string[]) => {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    const key = token.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const getCityLabel = (label?: string | null): string => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return label ?? 'Set location';
  }

  const filtered = removeSectorTokens(tokens);
  return filtered[0] ?? tokens[0];
};

export const getStateFromLabel = (label?: string | null): string | null => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return null;
  }

  const filtered = dedupeTokens(removeSectorTokens(tokens));
  if (filtered.length === 0) {
    return null;
  }

  // Typically the last token refers to the state/region in "City, District, State" labels
  return filtered[filtered.length - 1];
};

export const getDistrictStateLabel = (label?: string | null): string => {
  const tokens = extractCityTokens(label);
  if (tokens.length === 0) {
    return label ?? 'Set location';
  }

  const filtered = dedupeTokens(removeSectorTokens(tokens));
  if (filtered.length >= 2) {
    return `${filtered[0]}, ${filtered[1]}`;
  }

  if (filtered.length === 1 && tokens.length >= 2) {
    const dedupedTokens = dedupeTokens(tokens);
    const state = dedupedTokens.find((token) => token.toLowerCase() !== filtered[0].toLowerCase());
    if (state) {
      return `${filtered[0]}, ${state}`;
    }
  }

  return filtered[0] ?? tokens[0];
};

/** Navbar chip: show saved district when browser geocode provided it; else first place token from label. */
export const getDistrictPreferredChipLabel = (location: StoredLocation | null | undefined): string => {
  if (!location) return 'Set location';
  const d = location.district?.trim();
  if (d) return d;
  return getCityLabel(location.label);
};
