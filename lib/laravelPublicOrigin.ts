/**
 * Public web origin for Laravel (where `/storage/*` and payment QR files are served).
 * Mirrors `next.config.ts` `laravelProxyOrigin()` so route handlers stay in sync.
 */
export function laravelPublicOrigin(): string {
  const parseOrigin = (v: string | undefined): string | null => {
    const t = v?.trim();
    if (!t) return null;
    try {
      return new URL(t.includes('://') ? t : `https://${t}`).origin;
    } catch {
      return null;
    }
  };
  return (
    parseOrigin(process.env.BACKEND_PROXY_TARGET) ??
    parseOrigin(process.env.NEXT_PUBLIC_API_BASE_URL) ??
    'http://127.0.0.1:8000'
  );
}
