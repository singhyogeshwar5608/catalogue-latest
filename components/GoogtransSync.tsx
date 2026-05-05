'use client';

import { useLayoutEffect } from 'react';
import { syncGoogtransCookieWithStoredLanguage } from '@/src/lib/googleTranslateConfig';

/**
 * Run before <GoogleTranslateScripts /> so the translate script reads a cookie
 * that matches `user_selected_lang` (fixes production www/apex and stale /en/hi).
 */
export default function GoogtransSync() {
  useLayoutEffect(() => {
    syncGoogtransCookieWithStoredLanguage();
  }, []);
  return null;
}
