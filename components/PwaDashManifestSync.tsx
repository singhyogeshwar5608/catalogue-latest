'use client';

import { useEffect } from 'react';
import { getMyStores } from '@/src/lib/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  installDashboardPwaManifestLinkInDocument,
  setPwaDashStoreCookie,
} from '@/src/lib/pwaDashStoreCookie';
import { clearStoredBip } from '@/src/lib/pwaInstallPromptState';

/**
 * Do not put `link rel=manifest` for /dashboard in server metadata: the first fetch
 * runs before the `pwa_dash_store` cookie exists, so Chrome caches Larawans for install.
 * After `getMyStores` we set the cookie, inject the manifest, and clear a stale
 * `beforeinstallprompt` so a new one can use the store-branded JSON.
 * Logged-out: cookie absent → manifest route returns Larawans (correct).
 */
export default function PwaDashManifestSync() {
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      setPwaDashStoreCookie(null);
      installDashboardPwaManifestLinkInDocument();
      clearStoredBip();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stores = await getMyStores();
        if (cancelled) return;
        const prefer = user?.storeSlug?.trim();
        const picked =
          prefer
            ? stores.find((s) => s.username === prefer)
              ?? stores.find((s) => String(s.id) === prefer)
            : undefined;
        const u = (picked ?? stores[0])?.username?.trim();
        if (u) {
          setPwaDashStoreCookie(u);
        } else {
          setPwaDashStoreCookie(user?.storeSlug);
        }
      } catch {
        const slug = user?.storeSlug?.trim();
        if (slug) {
          setPwaDashStoreCookie(slug);
        }
      } finally {
        if (!cancelled) {
          installDashboardPwaManifestLinkInDocument();
          clearStoredBip();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.storeSlug]);

  return null;
}
