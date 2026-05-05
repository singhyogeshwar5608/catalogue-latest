import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverFetchStoreWithRaw } from '@/src/lib/serverApi';
import { pwaImageMimeTypeFromUrl, pwaIconAbsoluteFromLogo } from '@/src/lib/pwaAbsoluteUrl';
import { PWA_DASH_STORE_COOKIE } from '@/src/lib/pwaDashStoreCookie';
import { originFromIncomingRequest } from '@/src/lib/serverRequestOrigin';
import siteIcon from '@/assets/icon-512x512.svg';

function shortName(label: string): string {
  const t = label.trim() || 'Dashboard';
  if (t.length <= 12) return t;
  return `${t.slice(0, 12)}…`;
}

function brandIcons(origin: string) {
  const mainIcon = new URL(siteIcon.src, `${origin}/`).href;
  return [
    { src: mainIcon, sizes: '192x192', type: 'image/svg+xml' as const, purpose: 'any' as const },
    { src: mainIcon, sizes: '512x512', type: 'image/svg+xml' as const, purpose: 'any' as const },
    { src: new URL('/icon.svg', `${origin}/`).href, sizes: '512x512', type: 'image/svg+xml' as const, purpose: 'maskable' as const },
  ];
}

/**
 * PWA for seller dashboard: name + icon from the user’s store (via cookie), start at /dashboard.
 * Cookie is set in AuthContext from storeSlug. Without cookie, falls back to generic Larawans branding.
 * GET /dashboard/pwa/manifest
 */
export async function GET(req: Request) {
  const origin = originFromIncomingRequest(req);

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
    const body = {
      id: `${origin}/dashboard`,
      name: 'Larawans',
      short_name: 'Larawans',
      description: 'Open the dashboard after sign-in.',
      start_url: `${origin}/dashboard`,
      scope: '/',
      display: 'standalone' as const,
      orientation: 'portrait' as const,
      background_color: '#ffffff',
      theme_color: '#0f172a',
      icons: brandIcons(origin),
    };
    return NextResponse.json(body, {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const row = await serverFetchStoreWithRaw(slug);
  if (!row) {
    const body = {
      id: `${origin}/dashboard`,
      name: 'Larawans',
      short_name: 'Larawans',
      description: 'Dashboard',
      start_url: `${origin}/dashboard`,
      scope: '/',
      display: 'standalone' as const,
      orientation: 'portrait' as const,
      background_color: '#ffffff',
      theme_color: '#0f172a',
      icons: brandIcons(origin),
    };
    return NextResponse.json(body, {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const name = String(row.store.name ?? 'My store').trim() || 'My store';
  const appTitle = `${name} · Dashboard`;
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
  const icons: Record<string, unknown>[] = [
    { src: primarySrc, sizes: '192x192', type: primaryType, purpose: 'any' },
    { src: primarySrc, sizes: '512x512', type: primaryType, purpose: 'any' },
    { src: primarySrc, sizes: '512x512', type: primaryType, purpose: 'maskable' },
  ];

  const body: Record<string, unknown> = {
    id: `${origin}/dashboard?store=${encodeURIComponent(slug)}`,
    name: appTitle,
    short_name: shortName(name),
    description: `Manage ${name} on Larawans`,
    start_url: `${origin}/dashboard`,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons,
  };

  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'private, no-store, must-revalidate',
    },
  });
}

export const dynamic = 'force-dynamic';
