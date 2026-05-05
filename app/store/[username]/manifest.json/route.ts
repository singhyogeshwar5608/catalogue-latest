import { getStorePwaManifestResponse } from '@/src/lib/storePwaManifest';

/**
 * Per-store PWA (canonical). Next.js only allows `app/manifest.ts` at the **root**;
 * per-store JSON must be a route handler, not a nested `manifest.ts`.
 * `app/store/[username]/layout.tsx` points `<link rel="manifest">` here.
 * Query `?v=…` is cache-bust only. GET /store/:username/manifest.json
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return getStorePwaManifestResponse(req, username);
}

export const dynamic = 'force-dynamic';
