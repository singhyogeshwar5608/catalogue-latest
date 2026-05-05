import { getStorePwaManifestResponse } from '@/src/lib/storePwaManifest';

/**
 * Legacy alias: same as `/store/:username/manifest.json` (kept for existing links).
 * GET /store/:username/pwa/manifest
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  return getStorePwaManifestResponse(req, username);
}

export const dynamic = 'force-dynamic';
