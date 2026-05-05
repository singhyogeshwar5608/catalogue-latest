import { headers } from 'next/headers';

const FALLBACK = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '');

/**
 * Origin of the current request (scheme + host), matching the browser’s address bar.
 * Using env `NEXT_PUBLIC_BASE_URL` for `<link rel="manifest">` breaks install when the user
 * is on `www.`, a preview host, or localhost. PWA install requires a same-origin manifest.
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host =
    h.get('x-forwarded-host')?.split(',')[0]?.trim()
    || h.get('host')?.trim()
    || null;
  if (!host) {
    return FALLBACK.replace(/^http:\/\//i, 'https://');
  }
  const rawProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocal =
    /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) || /^192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(host);
  /**
   * Node often sees `http` from the reverse proxy hop while the browser uses HTTPS.
   * Emitting `http://…` in metadata breaks mixed-content (manifest, icons).
   */
  let scheme: string;
  if (rawProto === 'https') {
    scheme = 'https';
  } else if (rawProto === 'http') {
    scheme = isLocal ? 'http' : 'https';
  } else {
    scheme = isLocal ? 'http' : 'https';
  }
  return `${scheme}://${host}`;
}

/** Route handlers (`Request`) — same TLS rules as {@link getRequestOrigin}. */
export function originFromIncomingRequest(req: Request): string {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return FALLBACK.replace(/^http:\/\//i, 'https://');
  }
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || url.host;
  const isLocal =
    /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host) ||
    /^192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(host);
  let scheme: string;
  if (forwardedProto === 'https') {
    scheme = 'https';
  } else if (forwardedProto === 'http') {
    scheme = isLocal ? 'http' : 'https';
  } else {
    const fromUrl = url.protocol.replace(':', '');
    if (fromUrl === 'http' && !isLocal) {
      scheme = 'https';
    } else if (fromUrl === 'http' || fromUrl === 'https') {
      scheme = fromUrl;
    } else {
      scheme = isLocal ? 'http' : 'https';
    }
  }
  return `${scheme}://${host}`;
}
