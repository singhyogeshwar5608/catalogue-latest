import { readGoogtransPairFromDocument } from '@/src/lib/googleTranslateConfig';

/**
 * True when Google Translate has applied (or will apply) non-English translation.
 * In that mode the widget rewrites the DOM; React client-side navigation then often
 * crashes with "Cannot read properties of null (reading 'removeChild')".
 */
export function isGoogleTranslatedDocument(): boolean {
  if (typeof document === 'undefined') return false;
  const html = document.documentElement;
  if (html.classList.contains('translated-ltr') || html.classList.contains('translated-rtl')) {
    return true;
  }
  // Widget / banner iframes and chrome often remain after partial navigation; DOM is still mutated.
  if (
    document.querySelector(
      [
        '.goog-te-banner-frame',
        '.goog-tooltip',
        '.skiptranslate iframe',
        'iframe[src*="translate.google"]',
        'iframe[class*="goog-te"]',
      ].join(', '),
    )
  ) {
    return true;
  }
  const pair = readGoogtransPairFromDocument();
  if (pair && pair !== '/en/en' && /^\/[a-z]{2}\/[a-z]{2}/i.test(pair)) {
    return true;
  }
  return false;
}
