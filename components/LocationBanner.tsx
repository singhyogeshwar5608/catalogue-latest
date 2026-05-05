"use client";

import { MapPin, Navigation, Pencil } from 'lucide-react';
import { useLocationContext } from '@/src/context/LocationContext';
import { useState } from 'react';

export default function LocationBanner() {
  const { location, isLoading, error, detectFromBrowser, detectFromIp, setManualLocation } = useLocationContext();
  const [customLocation, setCustomLocation] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  return (
    <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-2xl p-4 md:p-5 mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm md:text-base text-gray-700">
        <MapPin className="w-5 h-5 text-primary" />
        {isLoading ? (
          <p>Detecting your location…</p>
        ) : location ? (
          <p>
            <span className="font-semibold">Showing stores near:</span> {location.label}
          </p>
        ) : (
          <p>
            <span className="font-semibold">Location not set.</span> Use the buttons to choose your city.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3 w-full md:w-auto">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-inner">
            <Pencil className="w-4 h-4 text-primary" />
            <input
              type="text"
              value={customLocation}
              onChange={(event) => setCustomLocation(event.target.value)}
              placeholder="Type a city or area"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <button
              onClick={async () => {
                if (!customLocation.trim()) return;
                setIsApplying(true);
                await setManualLocation(customLocation.trim());
                setIsApplying(false);
                setCustomLocation('');
              }}
              className="text-primary text-xs font-semibold disabled:opacity-50"
              disabled={isApplying}
            >
              Save
            </button>
          </div>
          <button
            onClick={async () => {
              setIsApplying(true);
              await detectFromBrowser();
              setIsApplying(false);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition disabled:opacity-60"
            disabled={isApplying}
          >
            <Navigation className="w-4 h-4" />
            Use my location
          </button>
          <button
            onClick={detectFromIp}
            className="rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            disabled={isApplying}
          >
            Auto-detect
          </button>
        </div>
      </div>
    </div>
  );
}
