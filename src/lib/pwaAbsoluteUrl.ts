function publicSiteOrigin(): string {
  const raw = (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://larawans.com'
  ).replace(/\/+$/, '');
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = u.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host);
    if (!isLocal && u.protocol === 'http:') {
      u.protocol = 'https:';
    }
    return u.origin.replace(/\/+$/, '');
  } catch {
    return 'https://larawans.com';
  }
}

const SITE = publicSiteOrigin();

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  `${(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://larawans.com').replace(/\/+$/, '')}/api/v1/v1`;

/**
 * Same rules as the store page — stable absolute URLs for manifest icons.
 */
export function pwaIconAbsoluteFromLogo(logo: string | null | undefined): string | null {
  if (typeof logo !== 'string') return null;
  const value = logo.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
    return value;
  }
  if (value.startsWith('/')) {
    return `${SITE}${value}`;
  }
  if (value.startsWith('storage/')) {
    return `${SITE}/${value}`;
  }
  if (value.startsWith('store-logos/') || value.startsWith('products/')) {
    return `${SITE}/storage/${value}`;
  }
  const apiOrigin = (() => {
    try {
      return new URL(API_BASE).origin;
    } catch {
      return SITE;
    }
  })();
  return `${apiOrigin}/${value.replace(/^\/+/, '')}`;
}

export function pwaImageMimeTypeFromUrl(url: string): string {
  const u = url.toLowerCase().split('?')[0] ?? url;
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.svg') || u.includes('.svg')) return 'image/svg+xml';
  return 'image/png';
}
