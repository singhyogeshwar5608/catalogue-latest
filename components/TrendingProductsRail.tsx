'use client';

import type { Product } from '@/types';
import ProductCard from '@/components/ProductCard';

type TrendingProduct = Product & {
  storeUsername?: string;
};

type TrendingProductsRailProps = {
  products: TrendingProduct[];
};

const TRENDING_DISPLAY_COUNT = 10;

export default function TrendingProductsRail({ products }: TrendingProductsRailProps) {
  const display = products.slice(0, TRENDING_DISPLAY_COUNT);

  if (!products.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-5 py-10 text-center text-sm font-medium text-slate-500">
        No products available right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-[360px]:grid-cols-1 max-[360px]:gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {display.map((product) => (
        <ProductCard
          key={`${product.storeId}-${product.id}`}
          product={product}
          href={product.storeUsername ? `/store/${product.storeUsername}` : undefined}
          openInModal={false}
          hideDescription={true}
          tallImage={true}
        />
      ))}
    </div>
  );
}
