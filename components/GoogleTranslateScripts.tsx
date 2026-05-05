'use client';

import { useEffect } from 'react';
import { GOOGLE_PAGE_SOURCE_LANG } from '@/src/lib/googleTranslateConfig';

/**
 * Loads Google Translate without inline `<Script>` template strings in the root layout
 * (avoids rare "Invalid or unexpected token" / hydration issues in dev).
 */
export default function GoogleTranslateScripts() {
  useEffect(() => {
    if (document.querySelector('script[src*="translate.google.com/translate_a/element.js"]')) {
      return;
    }

    const w = window as Window & {
      googleTranslateElementInit?: () => void;
      google?: { translate?: { TranslateElement: new (opts: object, id: string) => void } };
    };

    w.googleTranslateElementInit = () => {
      try {
        if (!w.google?.translate?.TranslateElement) return;
        new w.google.translate.TranslateElement(
          { pageLanguage: GOOGLE_PAGE_SOURCE_LANG, autoDisplay: false },
          'google_translate_element',
        );
      } catch {
        /* ignore */
      }
    };

    const el = document.createElement('script');
    el.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    el.async = true;
    document.body.appendChild(el);
  }, []);

  return null;
}
