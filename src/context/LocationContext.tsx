"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchIpLocation,
  geocodePlace,
  loadStoredLocation,
  persistStoredLocation,
  reverseGeocodeDetails,
  type LocationSuggestion,
  type StoredLocation,
} from '@/src/lib/location';

interface LocationContextValue {
  location: StoredLocation | null;
  isLoading: boolean;
  error: string | null;
  detectFromIp: () => Promise<void>;
  detectFromBrowser: () => Promise<void>;
  setManualLocation: (query: string) => Promise<void>;
  setSuggestedLocation: (suggestion: LocationSuggestion) => void;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<StoredLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedPrecise = useRef(false);

  const updateLocation = useCallback((value: StoredLocation | null) => {
    setLocation(value);
    persistStoredLocation(value);
  }, []);

  const detectFromIp = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const detected = await fetchIpLocation();
    if (!detected) {
      setError('Unable to detect location automatically.');
      setIsLoading(false);
      return;
    }
    updateLocation(detected);
    setIsLoading(false);
  }, [updateLocation]);

  const detectFromBrowser = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    setIsLoading(true);
    setError(null);

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const details = await reverseGeocodeDetails(latitude, longitude);
          let label = details?.label ?? null;
          let district = details?.district;
          if (!label) {
            const ipFallback = await fetchIpLocation();
            label = ipFallback?.label ?? `Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}`;
            district = undefined;
          }
          updateLocation({
            label,
            latitude,
            longitude,
            source: 'browser',
            updatedAt: new Date().toISOString(),
            ...(district ? { district } : {}),
          });
          setIsLoading(false);
          resolve();
        },
        (geoError) => {
          setError(geoError.message || 'Unable to access device location.');
          setIsLoading(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, [updateLocation]);

  const attemptPreciseDetection = useCallback(async () => {
    if (hasAttemptedPrecise.current) {
      return;
    }
    hasAttemptedPrecise.current = true;

    if (!navigator.geolocation) {
      return;
    }

    const shouldPrompt = async () => {
      if (typeof navigator.permissions?.query !== 'function') {
        return true;
      }
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        return status.state !== 'denied';
      } catch (permissionError) {
        console.warn('Permission check failed', permissionError);
        return true;
      }
    };

    if (await shouldPrompt()) {
      detectFromBrowser();
    }
  }, [detectFromBrowser]);

  useEffect(() => {
    const cached = loadStoredLocation();
    if (cached) {
      setLocation(cached);
      setIsLoading(false);
      return;
    }

    detectFromIp().finally(() => {
      attemptPreciseDetection();
    });
  }, [attemptPreciseDetection, detectFromIp]);

  const setManualLocation = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setIsLoading(true);
      setError(null);
      const result = await geocodePlace(query.trim());
      if (!result) {
        setError('Location not found. Try another city or area.');
        setIsLoading(false);
        return;
      }
      updateLocation({
        label: result.label,
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      });
      setIsLoading(false);
    },
    [updateLocation]
  );

  const setSuggestedLocation = useCallback(
    (suggestion: LocationSuggestion) => {
      updateLocation({
        label: suggestion.label || `${suggestion.city}${suggestion.state ? `, ${suggestion.state}` : ''}`,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        source: 'manual',
        updatedAt: new Date().toISOString(),
        ...(suggestion.district?.trim() ? { district: suggestion.district.trim() } : {}),
      });
    },
    [updateLocation]
  );

  const clearLocation = useCallback(() => {
    updateLocation(null);
  }, [updateLocation]);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      isLoading,
      error,
      detectFromIp,
      detectFromBrowser,
      setManualLocation,
      setSuggestedLocation,
      clearLocation,
    }),
    [location, isLoading, error, detectFromIp, detectFromBrowser, setManualLocation, setSuggestedLocation, clearLocation]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
