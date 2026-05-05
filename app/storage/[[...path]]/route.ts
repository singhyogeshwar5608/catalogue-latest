import { NextResponse } from 'next/server';
import { laravelPublicOrigin } from '@/lib/laravelPublicOrigin';

/**
 * Proxies `/storage/*` to Laravel's public disk with a server-side fetch.
 * Rewrites alone were returning 422 / plain-text errors from the upstream stack for some images;
 * this path returns the real file bytes and a correct Content-Type for `<img>` / `next/image`.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!Array.isArray(segments) || segments.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const unsafe = segments.join('/');
  if (unsafe.includes('..') || unsafe.startsWith('/')) {
    return new NextResponse(null, { status: 400 });
  }

  const origin = laravelPublicOrigin().replace(/\/+$/, '');
  const upstreamUrl = `${origin}/storage/${segments.map(encodeURIComponent).join('/')}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
        'User-Agent': 'CatelogStorageProxy/1.0',
      },
      cache: 'no-store',
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status === 404 ? 404 : 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
