'use client';

import Link from 'next/link';
import VerifiedSellerCard from '@/components/VerifiedSellerCard';
import StoreCard from '@/components/StoreCard';
import type { Store } from '@/types';

const HOME_STORES_PREVIEW_MAX = 30;

type StoreCategoryShowcaseProps = {
  stores: Store[];
};

export default function StoreCategoryShowcase({ stores }: StoreCategoryShowcaseProps) {
  const previewStores = stores.slice(0, HOME_STORES_PREVIEW_MAX);
  const mobilePreviewStores = previewStores;
  const hasMoreStores = stores.length > HOME_STORES_PREVIEW_MAX;

  return (
    <div className="space-y-8">
      {stores.length ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:hidden">
            {mobilePreviewStores.map((store) => (
              <div key={store.id} className="col-span-1 min-h-0 min-w-0 w-full">
                <StoreCard store={store} isCompact />
              </div>
            ))}
          </div>

          {hasMoreStores ? (
            <div className="mt-[10%] flex justify-center sm:hidden">
              <Link
                href="/all-stores"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                All Stores
              </Link>
            </div>
          ) : null}

          <div className="hidden grid-cols-1 gap-6 sm:grid md:grid-cols-2 lg:grid-cols-3">
            {previewStores.map((store) => (
              <div key={store.id} className="min-h-0 w-full">
                <VerifiedSellerCard store={store} />
              </div>
            ))}
          </div>
          {hasMoreStores ? (
            <div className="hidden justify-center sm:flex">
              <Link
                href="/all-stores"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                All Stores
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl">
          <p className="text-xl font-semibold text-slate-900">No stores in this category yet</p>
          <p className="text-slate-500 mt-2">Try switching categories to explore other sellers.</p>
        </div>
      )}
    </div>
  );
}
