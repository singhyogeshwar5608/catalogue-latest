import { Suspense } from 'react';
import HomePageClient from '@/components/home/HomePageClient';
import {
  serverFetchTrendingProducts,
  serverListPublicStores,
} from '@/src/lib/serverApi';

/** Same store list source and freshness as `/all-stores` (Laravel direct, no-store), not a client-only fetch. */
export const revalidate = 0;

function HomeFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
    </div>
  );
}

export default async function Home() {
  const [initialStores, initialPaidStores, initialTrendingProducts] = await Promise.all([
    serverListPublicStores({ limit: 50 }).catch(() => []),
    serverListPublicStores({ limit: 12, paid_subscription: true }).catch(() => []),
    serverFetchTrendingProducts(24).catch(() => []),
  ]);

  return (
    <Suspense fallback={<HomeFallback />}>
      <HomePageClient
        initialStores={initialStores}
        initialPaidStores={initialPaidStores}
        initialTrendingProducts={initialTrendingProducts}
      />
    </Suspense>
  );
}
