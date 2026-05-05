import { Suspense } from 'react';
import { perfLog } from '@/src/lib/perfLog';
import { serverListPublicStores } from '@/src/lib/serverApi';
import ProductsPageClient from './ProductsPageClient';

function ProductsFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  );
}

export default async function ProductsPage() {
  perfLog('products', 'server: stores fetch start');
  const initialStores = await serverListPublicStores({ limit: 100 });
  perfLog('products', `server: stores ready (${initialStores.length})`);

  return (
    <Suspense fallback={<ProductsFallback />}>
      <ProductsPageClient initialStores={initialStores} />
    </Suspense>
  );
}
