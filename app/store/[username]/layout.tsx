import type { Metadata } from 'next';
import { serverFetchStoreWithRaw } from '@/src/lib/serverApi';
import { getRequestOrigin } from '@/src/lib/serverRequestOrigin';

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

/**
 * PWA: per-store `link rel=manifest` must be an absolute https URL in production so
 * DevTools/Chrome/Edge can fetch it. Do not strip links on the client.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const row = await serverFetchStoreWithRaw(username);
  if (!row) {
    return {};
  }
  const origin = await getRequestOrigin();
  const v = encodeURIComponent(
    String(
      (row.store as { updatedAt?: string })?.updatedAt
        ?? (row.store as { createdAt?: string })?.createdAt
        ?? row.store.id
        ?? username,
    ),
  );
  const pathSeg = encodeURIComponent(username.trim());
  const manifestUrl = `${origin}/store/${pathSeg}/manifest.json?v=${v}`;
  return {
    manifest: manifestUrl,
  };
}

export default function StoreSegmentLayout({ children }: Props) {
  return children;
}
