'use client';

import { useLayoutEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Download } from 'lucide-react';
import {
  ensureGlobalBeforeInstallListener,
  getStoredBip,
  clearStoredBip,
  type BeforeInstallPrompt,
} from '@/src/lib/pwaInstallPromptState';

/**
 * Chrome/Edge often hide the address-bar "Install" after client navigation.
 * `beforeinstallprompt` is stored in `pwaInstallPromptState` so the dashboard
 * can clear it when the real manifest (after cookie) is injected.
 */
export default function PwaStoreInstallButton() {
  const pathname = usePathname();
  const deferred = useRef<BeforeInstallPrompt | null>(null);
  const [show, setShow] = useState(false);

  const isStorePath = Boolean(pathname && /^\/store\/[^/]+/.test(pathname));
  const isInstallPath = Boolean(
    pathname
      && (isStorePath || /^\/dashboard(\/|$)/.test(pathname)),
  );

  useLayoutEffect(() => {
    ensureGlobalBeforeInstallListener();
    const sync = () => {
      const s = getStoredBip();
      deferred.current = s;
      setShow(Boolean(isInstallPath && s));
    };
    sync();
    window.addEventListener('larawans-pwa-bip', sync);
    return () => window.removeEventListener('larawans-pwa-bip', sync);
  }, [isInstallPath, pathname]);

  const onClick = useCallback(async () => {
    const p = getStoredBip() ?? deferred.current;
    if (!p) return;
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === 'accepted') {
        clearStoredBip();
        deferred.current = null;
        setShow(false);
      }
    } catch {
      /* empty */
    }
  }, []);

  if (!isInstallPath || !show) {
    return null;
  }

  /** Store pages: keep bottom-left so fixed “Share via WhatsApp” (bottom-right) is not covered. */
  const positionClass = isStorePath
    ? 'left-3 right-auto md:left-6 md:right-auto'
    : 'right-3 md:right-6';

  return (
    <div
      className={`pointer-events-auto fixed bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[60] md:bottom-6 ${positionClass}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg ring-1 ring-slate-900/5 transition hover:border-primary/40 hover:text-primary md:text-sm"
      >
        <Download className="h-4 w-4" aria-hidden />
        Install app
      </button>
    </div>
  );
}
