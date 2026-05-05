'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * After App Router client navigation, Chrome may not re-run PWA installability
 * (address-bar install disappears). Nudging the manifest link + SW update helps;
 * a cache-bust on the manifest URL forces a fresh JSON fetch.
 */
export default function PwaSpaOmniboxRefresh() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === 'undefined' || !pathname) return;
    const isStore = /^\/store\/[^/]+/.test(pathname);
    const isDash = /^\/dashboard(\/|$)/.test(pathname);
    if (!isStore && !isDash) return;

    const t = window.setTimeout(() => {
      const m = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (!m) return;
      const href = m.getAttribute('href') || m.href;
      if (!href) return;
      const u = new URL(href, window.location.origin);
      u.searchParams.set('_pwa', String(Date.now()));
      // Do not replaceNode — Next/React may still own the <link>; replacing causes
      // "Cannot read properties of null (reading 'removeChild')" on the next update.
      m.href = u.toString();

      void navigator.serviceWorker?.getRegistration().then((reg) => {
        if (reg) void reg.update();
      });
    }, 0);

    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
