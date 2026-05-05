'use client';

import { useEffect } from 'react';
import { isGoogleTranslatedDocument } from '@/src/lib/isGoogleTranslatedDocument';

function sameDocumentLocation(a: string, b: string): boolean {
  try {
    const ua = new URL(a, window.location.origin);
    const ub = new URL(b, window.location.origin);
    return (
      ua.pathname === ub.pathname &&
      ua.search === ub.search &&
      ua.hash === ub.hash
    );
  } catch {
    return false;
  }
}

function isMerchantAppPath(pathnameWithQueryHash: string): boolean {
  try {
    const u = new URL(pathnameWithQueryHash, window.location.origin);
    const p = u.pathname;
    return p.startsWith('/dashboard') || p.startsWith('/admin');
  } catch {
    return (
      pathnameWithQueryHash.startsWith('/dashboard') || pathnameWithQueryHash.startsWith('/admin')
    );
  }
}

function currentDocLocation(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * 1) When Google Translate has rewritten the DOM, soft navigation must not run (React removeChild crashes).
 * 2) Store dashboard + admin always use full page loads on in-app navigations so the sidebar stays reliable
 *    even if Translate loaded earlier on a public page.
 */
export default function GoogleTranslateNavigationGuard() {
  useEffect(() => {
    const onPopState = () => {
      if (isGoogleTranslatedDocument()) {
        window.location.reload();
      }
    };
    window.addEventListener('popstate', onPopState);

    const shouldHardNavigate = (destPathSearchHash: string): boolean =>
      isGoogleTranslatedDocument() || isMerchantAppPath(destPathSearchHash);

    const onClickCapture = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const a = t.closest('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== '' && a.target !== '_self') return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const dest = `${url.pathname}${url.search}${url.hash}`;
      if (sameDocumentLocation(dest, currentDocLocation())) {
        return;
      }
      if (!shouldHardNavigate(dest)) return;
      e.preventDefault();
      e.stopPropagation();
      window.location.assign(dest);
    };

    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    const tryMerchantHardNav = (urlArg: unknown, useReplace: boolean): boolean => {
      if (typeof urlArg !== 'string' || urlArg.length === 0) {
        return false;
      }
      try {
        const next = new URL(urlArg, window.location.origin);
        if (next.origin !== window.location.origin) {
          return false;
        }
        const path = `${next.pathname}${next.search}${next.hash}`;
        if (sameDocumentLocation(path, currentDocLocation())) {
          return false;
        }
        if (!shouldHardNavigate(path)) {
          return false;
        }
        if (useReplace) {
          window.location.replace(path);
        } else {
          window.location.assign(path);
        }
        return true;
      } catch {
        return false;
      }
    };

    window.history.pushState = function pushStateGuard(...args: Parameters<History['pushState']>) {
      if (isGoogleTranslatedDocument()) {
        const urlArg = args[2];
        if (typeof urlArg === 'string' && urlArg.trim().length > 0) {
          try {
            const dest = new URL(urlArg, window.location.origin).toString();
            window.location.assign(dest);
            return;
          } catch {
            // fall back to reload below
          }
        }
        window.location.reload();
        return;
      }
      if (tryMerchantHardNav(args[2], false)) {
        return;
      }
      return origPush(...args);
    };

    window.history.replaceState = function replaceStateGuard(
      ...args: Parameters<History['replaceState']>
    ) {
      if (isGoogleTranslatedDocument()) {
        const urlArg = args[2];
        if (typeof urlArg === 'string' && urlArg.trim().length > 0) {
          try {
            const dest = new URL(urlArg, window.location.origin).toString();
            window.location.replace(dest);
            return;
          } catch {
            // fall back to reload below
          }
        }
        window.location.reload();
        return;
      }
      if (tryMerchantHardNav(args[2], true)) {
        return;
      }
      return origReplace(...args);
    };

    document.addEventListener('click', onClickCapture, true);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClickCapture, true);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, []);

  return null;
}
