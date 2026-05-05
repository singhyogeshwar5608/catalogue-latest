/**
 * Must stay in sync with `TranslateElement` `pageLanguage` in GoogleTranslateScripts.
 * Page HTML is written in `GOOGLE_PAGE_SOURCE_LANG`; the cookie is always
 * /{source}/{target} with source = page language (en), target = what to show.
 */
export const GOOGLE_PAGE_SOURCE_LANG = 'en';

function getExpectedPair(targetLang: string): string {
  const s = GOOGLE_PAGE_SOURCE_LANG;
  return targetLang === s ? `/${s}/${s}` : `/${s}/${targetLang}`;
}

/**
 * e.g. www.larawans.com and larawans.com share a cookie with Domain=.larawans.com
 * (host-only cookies often desync in production and leave translate stuck on the first
 * language, e.g. Hindi, while the UI already moved on).
 */
function getBaseDomainForCookie(): string | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return null;
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return null;
  const parts = h.split('.');
  if (parts.length < 2) return null;
  return parts.slice(-2).join('.');
}

function cookieFlags(): { secure: string } {
  const isHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  return { secure: isHttps ? '; Secure' : '' };
}

function normalizeGoogtransPair(v: string | null): string | null {
  if (v == null || v === '') return null;
  try {
    return decodeURIComponent(v.trim().replace(/\+/g, ' '));
  } catch {
    return v.trim();
  }
}

/**
 * `document.cookie` can list multiple `googtrans` (host vs eTLD+1) — use the last, like the browser.
 */
export function readGoogtransPairFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';');
  let last: string | null = null;
  for (const p of parts) {
    const m = p.trim().match(/^googtrans=(.*)$/i);
    if (m) {
      const n = normalizeGoogtransPair(m[1]);
      if (n) last = n;
    }
  }
  return last;
}

const clearAll = (domain?: string) => {
  const { secure } = cookieFlags();
  const d = domain ? `; domain=${domain}` : '';
  document.cookie = `googtrans=; max-age=0; path=/${d}${secure}`;
};

/**
 * Clear every variant of googtrans, then set the pair (eTLD+1 when not localhost).
 */
export function setGoogtransCookieForTarget(targetLang: string): string {
  if (typeof document === 'undefined') return '';
  const pair = getExpectedPair(targetLang);
  const { secure } = cookieFlags();
  const siteBase = getBaseDomainForCookie();

  clearAll();
  if (siteBase) {
    clearAll(`.${siteBase}`);
  }

  const sameSite = '; SameSite=Lax';
  const setOne = (domain?: string) => {
    const d = domain ? `; domain=${domain}` : '';
    document.cookie = `googtrans=${pair}; path=/${d}${sameSite}${secure}`;
  };
  if (siteBase) {
    setOne(`.${siteBase}`);
  } else {
    setOne();
  }
  return pair;
}

/**
 * If localStorage (or session) says one language but the `googtrans` cookie still has
 * another (common in production: www/apex, or a failed set), the widget still translates
 * to the old target (Hindi) while the dropdown shows the new one.
 * Run from useLayoutEffect so it runs before Google loads translate_a/element.js.
 */
export function syncGoogtransCookieWithStoredLanguage(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const stored =
    localStorage.getItem('user_selected_lang') ||
    sessionStorage.getItem('current_lang') ||
    null;
  if (!stored) return;
  const expected = getExpectedPair(stored);
  const current = readGoogtransPairFromDocument();
  if (current === expected) return;
  setGoogtransCookieForTarget(stored);
}
