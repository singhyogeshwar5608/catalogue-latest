import { NextResponse } from 'next/server';
import { serverFetchStoreWithRaw } from '@/src/lib/serverApi';
import { pwaImageMimeTypeFromUrl, pwaIconAbsoluteFromLogo } from '@/src/lib/pwaAbsoluteUrl';
import siteIcon from '@/assets/icon-512x512.svg';

const SITE_FALLBACK = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(
  /\/+$/,
  '',
);

function shortName(label: string): string {
  const t = label.trim() || 'Store';
  if (t.length <= 12) return t;
  return `${t.slice(0, 12)}…`;
}

/**
 * Per-store PWA: store name, store logo as app icon, start = this store.
 * Store is identified by the URL segment (`/store/:username/...`); the slug is
 * the source of truth. (Subdomain-only tenants would use a different entry route.)
 * Used by GET `/store/:username/manifest.json` and `/store/:username/pwa/manifest`.
 */
export async function getStorePwaManifestResponse(
  req: Request,
  pathUsername: string,
): Promise<NextResponse> {
  const username = pathUsername.trim();
  const row = await serverFetchStoreWithRaw(username);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const name = String(row.store.name ?? 'Store').trim() || 'Store';
  const slugPath = encodeURIComponent(username.trim());
  const origin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return SITE_FALLBACK;
    }
  })();
  const start = `${origin}/store/${slugPath}/`;
  const id = start;

  const version =
    (row.store as { updatedAt?: string })?.updatedAt
    ?? (row.store as { createdAt?: string })?.createdAt
    ?? row.store.id
    ?? username;
  const v = encodeURIComponent(String(version));

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
    id,
    name,
    short_name: shortName(name),
    description: name,
    start_url: start,
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
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
