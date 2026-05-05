import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import DashboardMain from '@/components/dashboard/DashboardMain';
import PwaDashManifestSync from '@/components/PwaDashManifestSync';
import { getRequestOrigin } from '@/src/lib/serverRequestOrigin';
import { serverFetchStoreWithRaw } from '@/src/lib/serverApi';
import { pwaIconAbsoluteFromLogo, pwaImageMimeTypeFromUrl } from '@/src/lib/pwaAbsoluteUrl';
import { PWA_DASH_STORE_COOKIE } from '@/src/lib/pwaDashStoreCookie';
import siteIcon from '@/assets/icon-512x512.svg';

/**
 * When `pwa_dash_store` is already on the request (returning visit), the install prompt can
 * still show Larawans if only the parent layout’s default icons / title apply. Mirror the
 * manifest: applicationName + favicons from the same store. No cookie → no override (client
 * `PwaDashManifestSync` sets cookie, then injects manifest on first visit).
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = await getRequestOrigin();
  const cookieStore = await cookies();
  const raw = cookieStore.get(PWA_DASH_STORE_COOKIE)?.value;
  const slug = raw
    ? (() => {
        try {
          return decodeURIComponent(raw).trim();
        } catch {
          return raw.trim();
        }
      })()
    : '';

  if (!slug) {
    return {};
  }

  const row = await serverFetchStoreWithRaw(slug);
  if (!row) {
    return {};
  }

  const name = String(row.store.name ?? 'My store').trim() || 'My store';
  const appLabel = `${name} · Dashboard`;
  const v = encodeURIComponent(
    String(
      (row.store as { updatedAt?: string })?.updatedAt
        ?? (row.store as { createdAt?: string })?.createdAt
        ?? row.store.id
        ?? slug,
    ),
  );
  const fromLogo = pwaIconAbsoluteFromLogo(row.store?.logo ? String(row.store.logo).trim() : null);
  const brandFallback = siteIcon.src.startsWith('http')
    ? siteIcon.src
    : new URL(siteIcon.src, `${origin}/`).href;
  const primarySrc = fromLogo
    ? `${fromLogo}${fromLogo.includes('?') ? '&' : '?'}v=${v}`
    : brandFallback;
  const primaryType = fromLogo ? pwaImageMimeTypeFromUrl(fromLogo) : 'image/svg+xml';

  return {
    applicationName: appLabel,
    title: appLabel,
    /** Path-only: browser resolves with the current page origin so HTTPS pages never get an `http://` manifest. */
    manifest: '/dashboard/pwa/manifest',
    icons: {
      icon: [
        { url: primarySrc, sizes: '192x192', type: primaryType },
        { url: primarySrc, sizes: '512x512', type: primaryType },
      ],
      apple: [{ url: primarySrc, type: primaryType, sizes: '180x180' }],
      shortcut: [{ url: primarySrc, type: primaryType }],
    },
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen min-w-0 bg-gray-50">
      <PwaDashManifestSync />
      <Sidebar />
      <DashboardMain>{children}</DashboardMain>
    </div>
  );
}

export const dynamic = 'force-dynamic';
