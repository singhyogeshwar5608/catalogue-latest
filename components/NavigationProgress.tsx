'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { perfLog } from '@/src/lib/perfLog';

/**
 * Thin top bar shown briefly after the pathname changes — instant feedback while
 * App Router loads the next segment (especially client-heavy pages).
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const [pulse, setPulse] = useState(0);
  const boot = useRef(true);
  const prev = useRef(pathname);

  useEffect(() => {
    if (boot.current) {
      boot.current = false;
      prev.current = pathname;
      return;
    }
    if (prev.current === pathname) return;
    prev.current = pathname;
    perfLog('nav', `pathname → ${pathname}`);
    setPulse((n) => n + 1);
  }, [pathname]);

  if (pulse === 0) return null;

  return (
    <div
      key={pulse}
      className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 overflow-hidden bg-slate-200/60"
      aria-hidden
    >
      <div className="nav-route-progress-indeterminate h-full w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />
    </div>
  );
}
