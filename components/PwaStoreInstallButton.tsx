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

  const isInstallPath = Boolean(
    pathname
      && !pathname.startsWith('/admin')
      && pathname !== '/login'
      && pathname !== '/help-center'
  );

  useLayoutEffect(() => {
    ensureGlobalBeforeInstallListener();
    const sync = () => {
      const s = getStoredBip();
      if (s) {
        deferred.current = s;
      }
      setShow(Boolean(isInstallPath && (s || deferred.current)));
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

  /** 
   * Keep bottom-left on both mobile and desktop.
   * Desktop: slightly higher (30px extra) to avoid hiding Sidebar Logout button.
   */
  const positionClass = 'left-3 right-auto md:left-6 md:right-auto';

  return (
    <div
      className={`pointer-events-auto fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-[60] md:bottom-[84px] ${positionClass}`}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10 transition hover:bg-black md:text-sm"
      >
        <Download className="h-4 w-4" aria-hidden />
        Install app
      </button>
    </div>
  );
}
