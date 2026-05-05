"use client";

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Truck,
  ShieldCheck,
  Package,
  ArrowUpRight,
  MessageCircle,
  Phone,
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import type { Product, Store } from '@/types';
import { getProductById, isApiError } from '@/src/lib/api';

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

type Review = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
};

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'specs'>('description');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', name: '' });

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: fetchedProduct, store: fetchedStore } = await getProductById(id);
        if (!isMounted) return;
        setProduct(fetchedProduct);
        setStore(fetchedStore);
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          setError(err.message || 'Unable to load product');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load product');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Product not found</h1>
          <p className="text-gray-600 mb-6">{error || 'This product may have been removed.'}</p>
          <Link href="/" className="text-primary hover:underline">Return to homepage</Link>
        </div>
      </div>
    );
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const galleryImages = [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean).slice(0, 5);
  const whatsappLink = store ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}` : '#';
  const sellerPhone = store?.whatsapp?.replace(/[^0-9+]/g, '') ?? '';

  const mockReviews: Review[] = [
    {
      id: '1',
      userName: 'Rajesh Kumar',
      rating: 5,
      comment: 'Excellent product! Quality is top-notch and delivery was fast.',
      date: '2 days ago',
      verified: true,
    },
    {
      id: '2',
      userName: 'Priya Sharma',
      rating: 4,
      comment: 'Good value for money. Packaging could be better.',
      date: '1 week ago',
      verified: true,
    },
  ];

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Review submitted:', reviewForm);
    setShowReviewForm(false);
    setReviewForm({ rating: 5, comment: '', name: '' });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) {
      return '—';
    }
    return `₹${value.toLocaleString()}`;
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const baseUnitLabel = (() => {
    if (product.unitType === 'custom' && product.unitCustomLabel) {
      return product.unitCustomLabel;
    }
    if (product.unitType) {
      return product.unitType.replace(/_/g, ' ');
    }
    return 'unit';
  })();

  const formatQuantityLabel = (quantity?: number | null) => {
    if (!quantity) return null;
    const label = baseUnitLabel;
    if (quantity === 1) return `${quantity} ${label}`;
    return `${quantity} ${label}${label.endsWith('s') ? '' : 's'}`;
  };

  const unitDisplayLabel =
    product.unitQuantity && product.unitQuantity > 0
      ? formatQuantityLabel(product.unitQuantity) ?? baseUnitLabel
      : baseUnitLabel;

  const minimumOrderDisplay = formatQuantityLabel(product.minOrderQuantity) ?? 'No minimum order';

  const hasDiscountPrice = Boolean(product.discountPrice && product.discountPrice > 0);
  const hasDiscount = Boolean(product.discountEnabled && hasDiscountPrice);
  const hasWholesale = Boolean(product.wholesaleEnabled && product.wholesalePrice != null);

  const discountWindow =
    product.discountScheduleEnabled && (product.discountStartsAt || product.discountEndsAt)
      ? [formatDate(product.discountStartsAt), formatDate(product.discountEndsAt)]
          .filter(Boolean)
          .join(' – ')
      : null;

  const orderDetails: { label: string; value: string }[] = [
    { label: 'Unit size', value: unitDisplayLabel },
    { label: 'Minimum order', value: minimumOrderDisplay },
  ];

  if (hasDiscountPrice) {
    orderDetails.push({
      label: hasDiscount ? 'Discount price' : 'Offer price',
      value: formatCurrency(product.discountPrice),
    });
  }

  orderDetails.push({ label: 'Catalogue price', value: formatCurrency(product.price) });

  if (product.originalPrice) {
    orderDetails.push({ label: 'MRP', value: formatCurrency(product.originalPrice) });
  }

  if (hasWholesale) {
    orderDetails.push({ label: 'Wholesale price', value: formatCurrency(product.wholesalePrice) });
    if (product.wholesaleMinQty) {
      orderDetails.push({
        label: 'Wholesale minimum',
        value: formatQuantityLabel(product.wholesaleMinQty) ?? `${product.wholesaleMinQty}`,
      });
    }
  }

  if (discountWindow) {
    orderDetails.push({ label: 'Deal window', value: discountWindow });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
            <Link href="/" className="transition hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/#products" className="transition hover:text-slate-900">Products</Link>
            <span>/</span>
            <span className="text-slate-700">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800/40 bg-slate-900 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-800">
                <Image
                  src={galleryImages[selectedImage]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
                {discount > 0 && (
                  <div className="absolute left-4 top-4 rounded-full bg-rose-500/90 px-3 py-1 text-xs font-semibold text-white shadow">
                    {discount}% OFF
                  </div>
                )}
                <button
                  type="button"
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
                  onClick={() => {}}
                >
                  <Heart className="h-5 w-5" />
                </button>
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-sm transition hover:bg-white"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              {galleryImages.length > 1 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImage(idx)}
                      className={`relative aspect-square h-20 min-w-[5rem] overflow-hidden rounded-2xl border-2 transition ${
                        selectedImage === idx
                          ? 'border-slate-900'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-800/40 bg-slate-900/95 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-8">
              <h2 className="text-lg font-semibold text-white">Why shoppers love this product</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900">
                    <Truck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Fast doorstep delivery</p>
                    <p className="mt-1 text-xs text-slate-200/80">Within 2-4 days across major metros.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Secure purchase</p>
                    <p className="mt-1 text-xs text-slate-200/80">Catelog verified sellers & protected payments.</p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-900">
                    <Package className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Hassle-free returns</p>
                    <p className="mt-1 text-xs text-slate-200/80">7-day replacement support on eligible orders.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800/40 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{product.category || 'Product'}</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{product.name}</h1>
              {product.description && (
                <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-4">
                  {product.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating || 0)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{Number(product.rating ?? 0).toFixed(1)}</span>
                  <span className="text-xs font-medium text-slate-500">({product.totalReviews} reviews)</span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    product.inStock
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {product.inStock ? 'In stock • Ready to ship' : 'Back soon'}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)] sm:items-start">
                <div className="rounded-2xl border border-slate-900/10 bg-slate-900/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Todays price</p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl font-bold text-slate-900 sm:text-4xl">₹{product.price.toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="text-lg font-semibold text-slate-400 line-through">
                        ₹{product.originalPrice.toLocaleString()}
                      </span>
                    )}
                    {product.originalPrice && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-600">
                        Save ₹{(product.originalPrice - product.price).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Inclusive of all taxes • No hidden charges</p>
                </div>
                <div className="rounded-2xl border border-slate-900/10 bg-slate-900/90 p-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/50">Order details</p>
                  <ul className="mt-3 space-y-2">
                    {orderDetails.map((detail) => (
                      <li key={detail.label} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-white/70">{detail.label}</span>
                        <span className="font-semibold text-white">{detail.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {sellerPhone && (
                  <a
                    href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.3)] transition hover:shadow-[0_16px_38px_rgba(16,185,129,0.32)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat on WhatsApp
                  </a>
                )}
                <div className="flex flex-col gap-3 sm:flex-row">
                  {sellerPhone && (
                    <a
                      href={`tel:${sellerPhone}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-900 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                    >
                      <Phone className="h-4 w-4" />
                      Call seller
                    </a>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {store && (
              <div className="rounded-3xl border border-slate-900/10 bg-slate-900/95 p-6 shadow-[0_28px_70px_rgba(15,23,42,0.34)] sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/10">
                      <img
                        src={store.logo}
                        alt={store.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Sold by</p>
                      <div className="mt-1 flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{store.name}</h3>
                        {store.isVerified && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <p className="text-xs text-white/60">{store.location || 'Trusted Catelog merchant'}</p>
                    </div>
                  </div>
                  <Link
                    href={`/store/${store.username}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
                  >
                    Visit store
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12 space-y-6">
          <div className="rounded-full border border-slate-900/10 bg-white p-1 shadow-sm sm:mx-auto sm:w-fit">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {(['description', 'specs', 'reviews'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition sm:px-5 ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'specs' ? 'Specifications' : tab === 'reviews' ? `Reviews (${product.totalReviews})` : 'Description'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-900/10 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:p-8">
            {activeTab === 'description' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">About this product</h3>
                  <p className="mt-3 leading-relaxed text-slate-600 whitespace-pre-line">
                    {product.description || 'No description available for this product.'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Premium quality</h4>
                    <p className="mt-1 text-sm text-slate-600">Handpicked products inspected by Catelog merchandisers.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900">Speedy dispatch</h4>
                    <p className="mt-1 text-sm text-slate-600">Ready to ship within 24 hours for in-stock items.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-slate-900">Specifications</h3>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Category</dt>
                    <dd className="mt-2 text-sm font-semibold text-slate-900">{product.category}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Availability</dt>
                    <dd className="mt-2 text-sm font-semibold text-slate-900">{product.inStock ? 'In stock' : 'Out of stock'}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Seller</dt>
                    <dd className="mt-2 text-sm font-semibold text-slate-900">{store?.name || 'N/A'}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Return policy</dt>
                    <dd className="mt-2 text-sm font-semibold text-slate-900">7-day replacement</dd>
                  </div>
                </dl>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Customer reviews</h3>
                    <p className="text-sm text-slate-500">Hear from Catelog shoppers who tried this product.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    Write a review
                  </button>
                </div>

                {showReviewForm && (
                  <div className="rounded-3xl border border-slate-900/10 bg-slate-900/90 p-6 text-white shadow-[0_25px_70px_rgba(15,23,42,0.35)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-white">Share your experience</h4>
                      <button type="button" onClick={() => setShowReviewForm(false)} className="text-white/50 transition hover:text-white">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-white/80" htmlFor="reviewer_name">Your name</label>
                        <input
                          id="reviewer_name"
                          type="text"
                          value={reviewForm.name}
                          onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                          className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                          required
                        />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-white/80">Rating</span>
                        <div className="mt-2 flex gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating })}
                              className="rounded-full bg-white/20 p-1 text-amber-300 transition hover:scale-105"
                            >
                              <Star
                                className={`h-6 w-6 ${
                                  rating <= reviewForm.rating
                                    ? 'fill-amber-300 text-amber-300'
                                    : 'text-white/30'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-white/80" htmlFor="review_comment">Your review</label>
                        <textarea
                          id="review_comment"
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          rows={4}
                          className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                          placeholder="Tell fellow shoppers about fit, quality, delivery..."
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                      >
                        Submit review
                      </button>
                    </form>
                  </div>
                )}

                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <article key={review.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-slate-900">{review.userName}</h4>
                            {review.verified && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                                <Check className="h-3 w-3" />
                                Verified purchase
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex items-center gap-1 text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < review.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-medium text-slate-500">{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {sellerPhone && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white/95 px-4 py-4 shadow-[0_-10px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Price</p>
              <p className="text-lg font-semibold text-slate-900">₹{product.price.toLocaleString()}</p>
            </div>
            <a
              href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(16,185,129,0.28)]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
