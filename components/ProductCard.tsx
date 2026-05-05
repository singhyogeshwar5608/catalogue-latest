'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types';

const CARD_BG = '#ffffff';
const FALLBACK_PRODUCT_IMAGE = '/fallback/product-placeholder.svg';

interface ProductCardProps {
  product: Product;
  href?: string;
  openInModal?: boolean;
  /** `cover` = image fills the media frame edge-to-edge (may crop). `contain` letterboxes (full image visible). */
  imageObjectFit?: 'contain' | 'cover';
  /** When true, hides the short description line in the card (listing pages). */
  hideDescription?: boolean;
}

function buildGallery(product: Product): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string | undefined | null) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    urls.push(u);
  };
  add(product.image);
  (product.images ?? []).forEach(add);
  return urls;
}

export default function ProductCard({
  product,
  href,
  openInModal = true,
  imageObjectFit = 'cover',
  hideDescription = false,
}: ProductCardProps) {
  const [showModal, setShowModal] = useState(false);
  const gallery = useMemo(() => buildGallery(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [heroImageSrc, setHeroImageSrc] = useState(gallery[activeIndex] ?? product.image);
  const [modalImageSrc, setModalImageSrc] = useState(product.image);

  const heroSrc = gallery[activeIndex] ?? product.image;
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const displayPrice = product.price > 0 ? `₹${product.price}` : 'On request';
  const badgeLabel = discount > 0 ? 'Best Seller' : 'Featured';

  useEffect(() => {
    setHeroImageSrc(heroSrc || FALLBACK_PRODUCT_IMAGE);
  }, [heroSrc]);

  useEffect(() => {
    setModalImageSrc(product.image || FALLBACK_PRODUCT_IMAGE);
  }, [product.image]);

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const cardContent = (
    <div
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-slate-500 bg-white font-sans shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      style={{ backgroundColor: CARD_BG }}
    >
      <div className="relative min-w-0 overflow-hidden">
        <div className="relative aspect-[4/3] w-full min-w-0 max-w-full bg-slate-100">
          <Image
            src={heroImageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            className={`${imageObjectFit === 'cover' ? 'object-cover object-center' : 'object-contain object-center'} transition duration-300 group-hover:brightness-[1.03]`}
            onError={() => {
              setHeroImageSrc(FALLBACK_PRODUCT_IMAGE);
            }}
          />
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold text-slate-800 shadow-sm md:left-3 md:top-3 md:px-2.5 md:py-1 md:text-[10px]">
            {badgeLabel}
          </span>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="font-semibold text-white">Out of stock</span>
          </div>
        )}
        {gallery.length > 1 ? (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {gallery.slice(0, 5).map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={(e) => {
                  stop(e);
                  setActiveIndex(i);
                }}
                className={`h-1.5 w-1.5 rounded-full transition md:h-2 md:w-2 ${activeIndex === i ? 'bg-white' : 'bg-white/55'}`}
                aria-label={`Show image ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#E3E6E8] p-3 md:p-4">
        <div className="min-w-0">
          <h3
            className="truncate text-[15px] font-bold leading-tight text-slate-900 md:text-lg"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>
        {!hideDescription ? (
          <p
            className={`mt-0.5 min-w-0 truncate text-[11px] leading-snug md:mt-1 md:text-xs md:leading-relaxed ${
              product.description?.trim() ? 'text-slate-500' : 'invisible'
            }`}
            title={product.description?.trim() || undefined}
            aria-hidden={!product.description?.trim()}
          >
            {product.description?.trim() || '\u00a0'}
          </p>
        ) : null}

        <div className="mt-auto flex min-w-0 items-center gap-2 pt-3 max-[380px]:gap-1.5 md:pt-4">
          <span className="inline-flex min-w-0 flex-1 truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-800 max-[380px]:px-1.5 max-[380px]:py-0.5 max-[380px]:text-[10px] md:px-3 md:py-1 md:text-sm">
            {displayPrice}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white max-[380px]:gap-0.5 max-[380px]:px-2 max-[380px]:py-0.5 max-[380px]:text-[10px] md:px-3.5 md:py-1.5 md:text-xs">
            Buy Now
            <ArrowRight className="h-3 w-3 shrink-0 max-[380px]:h-2.5 max-[380px]:w-2.5 md:h-3.5 md:w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {href && !openInModal ? (
        <Link
          href={href}
          className="group flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[16px] transition hover:opacity-[0.98] sm:rounded-[20px]"
        >
          {cardContent}
        </Link>
      ) : (
        <div
          className="group flex h-full min-w-0 w-full cursor-pointer flex-col overflow-hidden rounded-[16px] transition hover:opacity-[0.98] sm:rounded-[20px]"
          onClick={() => setShowModal(true)}
        >
          {cardContent}
        </div>
      )}

      {openInModal && showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-72 md:h-full">
                <Image
                  src={modalImageSrc}
                  alt={product.name}
                  fill
                  className="object-contain"
                  onError={() => {
                    setModalImageSrc(FALLBACK_PRODUCT_IMAGE);
                  }}
                />
                {discount > 0 && (
                  <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600">
                    {discount}% off
                  </div>
                )}
              </div>
              <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{product.storeName}</p>
                  <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800">
                    x
                  </button>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold">{product.rating}</span>
                    <span className="text-gray-500">({product.totalReviews})</span>
                  </div>
                  <span className={`text-xs font-semibold ${product.inStock ? 'text-emerald-600' : 'text-red-600'}`}>
                    {product.inStock ? 'In stock' : 'Back soon'}
                  </span>
                </div>
                <p className="line-clamp-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-gray-900">{displayPrice}</span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 font-semibold text-white">
                    <ShoppingCart className="h-4 w-4" />
                    Contact seller
                  </button>
                  <Link
                    href={`/product/${product.id}`}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-gray-900 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-50"
                  >
                    View full details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
