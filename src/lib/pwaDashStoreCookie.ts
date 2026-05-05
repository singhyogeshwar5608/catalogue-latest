/**
 * Set by the client when the logged-in user has a store, so
 * `GET /dashboard/pwa/manifest` can return store name + logo (same origin cookie).
 * Not a secret: store slug is already public in URLs.
 */
export const PWA_DASH_STORE_COOKIE = 'pwa_dash_store';

const DEFAULT_MAX_AGE = 60 * 60 * 24 * 400; // ~400d

/**
 * Call from the browser when auth / store slug changes.
 */
export function setPwaDashStoreCookie(storeSlug: string | null | undefined): void {
  if (typeof document === 'undefined') return;
  const slug = typeof storeSlug === 'string' ? storeSlug.trim() : '';
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : '';
  if (!slug) {
    document.cookie = `${PWA_DASH_STORE_COOKIE}=; path=/; max-age=0; SameSite=Lax${secure}`;
    return;
  }
  const value = encodeURIComponent(slug);
  document.cookie = `${PWA_DASH_STORE_COOKIE}=${value}; path=/; max-age=${DEFAULT_MAX_AGE}; SameSite=Lax${secure}`;
}

const DASH_PWA_ATTR = 'data-pwa-larawans-dashboard';

/**
 * Bumps the manifest URL query so the browser refetches with the current cookie.
 */
export function nudgePwaManifestLinkInDocument(): void {
  if (typeof document === 'undefined') return;
  const m = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!m) return;
  const href = m.getAttribute('href') || m.href;
  if (!href) return;
  const u = new URL(href, window.location.origin);
  u.searchParams.set('_pwa', String(Date.now()));
  m.href = u.toString();
}

/**
 * Dashboard: inject the manifest link **after** the `pwa_dash_store` cookie is set
 * (JWT is not sent to the manifest URL). If the link is in SSR HTML, the first fetch
 * runs without a cookie and Chrome keeps "Larawans" for the install dialog.
 */
function isDashboardPwaManifestHref(raw: string): boolean {
  if (!raw) return false;
  try {
    return new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://localhost').pathname === '/dashboard/pwa/manifest';
  } catch {
    return raw.includes('/dashboard/pwa/manifest');
  }
}

/**
 * Prefer mutating an existing `<link rel="manifest">` in place. Next/React may own that node;
 * calling `remove()` on it triggers "Cannot read properties of null (reading 'removeChild')"
 * on the next update (same class of bug documented in `PwaSpaOmniboxRefresh`).
 */
export function installDashboardPwaManifestLinkInDocument(): void {
  if (typeof document === 'undefined') return;
  const hrefPath = '/dashboard/pwa/manifest';
  const u = new URL(hrefPath, window.location.origin);
  u.searchParams.set('v', String(Date.now()));
  const href = u.toString();

  // Dedupe prior client injections only.
  document.querySelectorAll(`link[rel="manifest"][${DASH_PWA_ATTR}]`).forEach((n) => n.remove());

  const dashboardManifestLinks = Array.from(document.querySelectorAll('link[rel="manifest"]')).filter((el) => {
    const raw = el.getAttribute('href') || (el as HTMLLinkElement).href || '';
    return isDashboardPwaManifestHref(raw);
  }) as HTMLLinkElement[];

  const primary = dashboardManifestLinks[0];
  if (primary) {
    primary.href = href;
    primary.setAttribute(DASH_PWA_ATTR, '1');
    for (let i = 1; i < dashboardManifestLinks.length; i++) {
      const el = dashboardManifestLinks[i];
      if (el.hasAttribute(DASH_PWA_ATTR)) {
        el.remove();
      }
    }
  } else {
    const link = document.createElement('link');
    link.setAttribute('rel', 'manifest');
    link.setAttribute('href', href);
    link.setAttribute(DASH_PWA_ATTR, '1');
    document.head.appendChild(link);
  }

  void navigator.serviceWorker?.getRegistration().then((reg) => {
    if (reg) void reg.update();
  });
}
