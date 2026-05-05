import { Suspense } from 'react';
import { perfLog } from '@/src/lib/perfLog';
import { serverListPublicStores } from '@/src/lib/serverApi';
import AllStoresClient from './AllStoresClient';

function AllStoresFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
    </div>
  );
}

export default async function AllStoresPage() {
  perfLog('all-stores', 'server: list fetch start');
  const initialStores = await serverListPublicStores({ limit: 120 });
  perfLog('all-stores', `server: list ready (${initialStores.length})`);

  return (
    <Suspense fallback={<AllStoresFallback />}>
      <AllStoresClient initialStores={initialStores} />
    </Suspense>
  );
}
