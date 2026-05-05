'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations, localeOptions, defaultLocale, stateLocaleMap } from '@/src/i18n/config';

const DEFAULT_LANGUAGE = defaultLocale;
const LANGUAGE_STORAGE_KEY = 'catelog-language-override';
const STATE_STORAGE_KEY = 'catelog-state-override';

const LocaleContextValue = {
  stateName: '',
  languageCode: '',
  languageLabel: '',
  strings: {},
  loading: false,
  error: null,
  availableLanguages: {},
  setLanguageOverride: () => {},
  resetLanguageOverride: () => {},
  setStateOverride: () => {},
  stateOverride: null,
};

const LocaleContext = createContext(undefined);

const resolveLanguageCode = (stateName) => {
  if (!stateName) {
    return DEFAULT_LANGUAGE;
  }
  const normalized = stateName.trim().toLowerCase();
  const mapped = stateLocaleMap[normalized] || DEFAULT_LANGUAGE;
  return translations[mapped] ? mapped : DEFAULT_LANGUAGE;
};

function useLocationLocaleInternal() {
  const [stateName, setStateName] = useState('Detecting…');
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [manualLanguage, setManualLanguage] = useState(null);
  const [stateOverride, setStateOverride] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && translations[stored]) {
      setManualLanguage(stored);
      setLanguageCode(stored);
    }
    const storedState = window.localStorage.getItem(STATE_STORAGE_KEY);
    if (storedState) {
      setStateOverride(storedState);
      setStateName(storedState);
      setLanguageCode(resolveLanguageCode(storedState));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const detectLocation = async () => {
      if (stateOverride) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('https://ip-api.com/json/?fields=status,message,regionName,region,country');
        const data = await response.json();

        if (!isMounted) return;

        if (data.status === 'success') {
          const detectedState = data.regionName || data.region || data.country || 'Unknown';
          setStateName(detectedState);
          if (!manualLanguage) {
            setLanguageCode(resolveLanguageCode(detectedState));
          }
        } else {
          setError(data.message || 'Unable to detect location');
          setStateName('Unknown');
          if (!manualLanguage) {
            setLanguageCode(DEFAULT_LANGUAGE);
          }
        }
      } catch (_err) {
        if (!isMounted) return;
        console.error('Location detection failed', _err);
        setError('Unable to reach location service');
        setStateName('Unknown');
        if (!manualLanguage) {
          setLanguageCode(DEFAULT_LANGUAGE);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, [manualLanguage, stateOverride]);

  useEffect(() => {
    if (stateOverride && !manualLanguage) {
      setStateName(stateOverride);
      setLanguageCode(resolveLanguageCode(stateOverride));
      setLoading(false);
    }
  }, [stateOverride, manualLanguage]);

  const setLanguageOverride = useCallback((code) => {
    const resolved = translations[code] ? code : DEFAULT_LANGUAGE;
    setManualLanguage(resolved);
    setLanguageCode(resolved);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
    }
  }, []);

  const resetLanguageOverride = useCallback(() => {
    setManualLanguage(null);
    setStateOverride(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      window.localStorage.removeItem(STATE_STORAGE_KEY);
    }
    setLanguageCode(resolveLanguageCode(stateName));
    if (stateName === 'Detecting…') {
      setLoading(true);
    }
  }, [stateName]);

  const setStateOverrideHandler = useCallback((state) => {
    if (!state) return;
    setStateOverride(state);
    setStateName(state);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STATE_STORAGE_KEY, state);
      window.dispatchEvent(new CustomEvent('stateChanged', { detail: { state } }));
    }
    const mapped = resolveLanguageCode(state);
    setManualLanguage(mapped);
    setLanguageCode(mapped);
  }, []);

  const strings = useMemo(() => translations[languageCode] || translations[DEFAULT_LANGUAGE], [languageCode]);
  const languageLabel = localeOptions[languageCode]?.label || localeOptions[DEFAULT_LANGUAGE].label;

  return {
    stateName,
    languageCode,
    languageLabel,
    strings,
    loading,
    error,
    availableLanguages: localeOptions,
    setLanguageOverride,
    resetLanguageOverride,
    setStateOverride: setStateOverrideHandler,
    stateOverride,
  };
}

export function LocationLocaleProvider({ children }) {
  const value = useLocationLocaleInternal();
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export default function useLocationLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocationLocale must be used within LocationLocaleProvider');
  }
  return context;
}
