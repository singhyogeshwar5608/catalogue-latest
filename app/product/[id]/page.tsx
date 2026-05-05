"use client";

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Star,
  Truck,
  ShieldCheck,
  Heart,
  Package,
  Clock3,
  Store as StoreIcon,
  ArrowUpRight,
  MessageCircle,
  Phone,
  ChevronLeft,
  Check,
  CreditCard,
  QrCode,
} from 'lucide-react';
import type { Product, Store, Review, RatingSummary, ReviewPagination, ProductCheckoutPublic } from '@/types';
import {
  getProductById,
  getProductReviews,
  submitProductReview,
  isApiError,
  createProductCheckoutRazorpayOrder,
  verifyProductCheckoutRazorpayPayment,
} from '@/src/lib/api';
import {
  BUYER_DETAILS_GATE_CANCELLED,
  buyerToCheckoutApiPayload,
  hasValidBuyerDetails,
  razorpayPrefillFromBuyer,
} from '@/components/store/BuyerDetailsFormModal';
import { useBuyerDetailsCheckoutGate } from '@/src/hooks/useBuyerDetailsCheckoutGate';
import { loadRazorpayCheckoutScript } from '@/src/lib/razorpayCheckoutScript';
import { checkoutQrImageSrc } from '@/src/lib/checkoutAssetUrl';
import RatingStars from '@/components/RatingStars';
import ReviewCard from '@/components/ReviewCard';
import PublicStorefrontAccessGate from '@/components/PublicStorefrontAccessGate';
import { useStorefrontTrialLock } from '@/components/StorefrontTrialLockContext';
import { useAuth } from '@/src/context/AuthContext';
import { isStoreTrialExpiredWithoutPaidPlan } from '@/src/lib/storeAccess';
import { buildReviewColors, getThemeForCategory } from '@/src/lib/reviewTheme';
import { ratingBreakdownFromSummaryOrReviews } from '@/src/lib/reviewRatingBreakdown';

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params);
  const { isLoggedIn, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<RatingSummary | null>(null);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewForm, setReviewForm] = useState<{ rating: number; comment: string }>({ rating: 0, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [checkout, setCheckout] = useState<ProductCheckoutPublic | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const themeKey = store?.businessType || product?.category;
  const theme = useMemo(() => getThemeForCategory(themeKey), [themeKey]);
  const { getBuyerDetails, ensureBuyerDetailsThen, buyerDetailsModal } = useBuyerDetailsCheckoutGate({
    sessionUsername: store?.username,
    storeName: store?.name ?? 'Store',
    accentColor: theme.primary,
  });
  const reviewColors = useMemo(() => buildReviewColors(theme), [theme]);
  const approvedReviews = useMemo(() => reviews.filter((review) => review.isApproved !== false), [reviews]);
  const ratingBreakdown = useMemo(
    () => ratingBreakdownFromSummaryOrReviews(reviewSummary, approvedReviews),
    [reviewSummary, approvedReviews]
  );
  const totalRecordedReviews = useMemo(
    () => Object.values(ratingBreakdown).reduce((sum, count) => sum + count, 0),
    [ratingBreakdown]
  );
  const aggregateRating = reviewSummary?.rating ?? product?.rating ?? 0;

  const viewerOwnsProductStore = useMemo(
    () =>
      Boolean(
        user?.id &&
          ((store?.userId && user.id === store.userId) ||
            (user.storeSlug &&
              store?.username &&
              user.storeSlug.toLowerCase() === store.username.toLowerCase()))
      ),
    [user?.id, user?.storeSlug, store?.userId, store?.username]
  );

  const trialLock = useStorefrontTrialLock();
  const blockVisitorCommerce = Boolean(
    store && !viewerOwnsProductStore && isStoreTrialExpiredWithoutPaidPlan(store),
  );

  const tryOpenTrialCommerceLock = () => {
    if (!blockVisitorCommerce) return false;
    trialLock?.openVisitorTrialLock();
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const { product: fetchedProduct, store: fetchedStore, checkout: fetchedCheckout } = await getProductById(id);
        if (!isMounted) return;
        setProduct(fetchedProduct);
        setStore(fetchedStore);
        setCheckout(fetchedCheckout);
        setRelatedProducts([]);
        await fetchReviews(id, 1);
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          setError(err.message || 'Unable to load product');
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load product');
        }
        setProduct(null);
        setStore(null);
        setCheckout(null);
        setRelatedProducts([]);
        setReviews([]);
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

  const fetchReviews = useCallback(
    async (productId: string, page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewError(null);
      try {
        const response = await getProductReviews(productId, { page, perPage: 5 });
        setReviewSummary(response.summary);
        setReviewPagination(response.pagination);
        setReviewPage(page);
        setReviews((previous) => (append ? [...previous, ...response.reviews] : response.reviews));
      } catch (err) {
        setReviewError(
          isApiError(err)
            ? err.message || 'Unable to load reviews'
            : err instanceof Error
              ? err.message
              : 'Unable to load reviews'
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!product?.id) return;
    fetchReviews(product.id, 1);
  }, [product?.id, fetchReviews]);

  const discount = useMemo(() => {
    if (!product || !product.originalPrice) return 0;
    return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const extraImages = Array.isArray(product.images) ? product.images : [];
    return [product.image, ...extraImages].filter(Boolean).slice(0, 4);
  }, [product]);

  const sellerPhone = store?.whatsapp?.replace(/[^0-9+]/g, '') ?? '';
  const whatsappLink = store ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}` : '#';

  const handleReviewFormChange = (partial: Partial<typeof reviewForm>) => {
    setReviewForm((previous) => ({ ...previous, ...partial }));
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;
    if (!isLoggedIn) {
      setReviewError('Please log in to submit a review.');
      return;
    }
    const trimmedComment = reviewForm.comment.trim();
    if (!reviewForm.rating || !trimmedComment) {
      setReviewError('Please provide a rating and comment.');
      return;
    }
    if (trimmedComment.length < 5) {
      setReviewError('Comment must be at least 5 characters.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const response = await submitProductReview(product.id, {
        rating: reviewForm.rating,
        comment: trimmedComment,
      });

      setReviews((previous) => {
        const filtered = previous.filter((item) => item.id !== response.review.id);
        return [response.review, ...filtered];
      });
      setReviewSummary(response.summary);
      setReviewForm({ rating: 0, comment: '' });
    } catch (err) {
      setReviewError(
        isApiError(err)
          ? err.message || 'Unable to submit review'
          : err instanceof Error
            ? err.message
            : 'Unable to submit review'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const [selectedPackage, setSelectedPackage] = useState('single');

  const handleLoadMoreReviews = () => {
    if (!product || !reviewPagination?.hasMore || reviewsLoading) return;
    const nextPage = reviewPage + 1;
    fetchReviews(product.id, nextPage, true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Product not found</h1>
          <p className="text-gray-600">This item may have been removed. Please explore the store for other products.</p>
        </div>
      </div>
    );
  }

  const unitBaseLabel = product.unitCustomLabel?.trim() || product.unitType?.replace(/_/g, ' ') || null;
  const formattedUnitLabel = unitBaseLabel
    ? product.unitQuantity && product.unitQuantity > 0
      ? `${product.unitQuantity} ${unitBaseLabel}`
      : unitBaseLabel
    : null;

  const productDescription = product.description?.trim() || 'Description will appear here when the seller or admin adds product details.';

  const purchaseOptions = [
    {
      id: 'single',
      title: 'Single order',
      subtitle: formattedUnitLabel ? `1 × ${formattedUnitLabel}` : 'Standard order option',
      price: product.price,
      helper: product.inStock ? 'Suitable for immediate purchase.' : 'Seller will confirm availability.',
    },
    ...(product.minOrderQuantity && product.minOrderQuantity > 1
      ? [
          {
            id: 'minimum',
            title: 'Minimum quantity',
            subtitle: `${product.minOrderQuantity} ${product.minOrderQuantity === 1 ? 'item' : 'items'}`,
            price: product.price * product.minOrderQuantity,
            helper: 'For products with a required minimum order quantity.',
          },
        ]
      : []),
    ...(product.wholesaleEnabled && product.wholesalePrice
      ? [
          {
            id: 'wholesale',
            title: 'Wholesale order',
            subtitle: `${product.wholesaleMinQty ?? Math.max(product.minOrderQuantity ?? 2, 2)}+ items`,
            price: product.wholesalePrice * (product.wholesaleMinQty ?? Math.max(product.minOrderQuantity ?? 2, 2)),
            helper: `Bulk pricing at ₹${product.wholesalePrice.toFixed(0)} per item.`,
          },
        ]
      : []),
  ];

  const activePurchaseId = purchaseOptions.some((option) => option.id === selectedPackage)
    ? selectedPackage
    : (purchaseOptions[0]?.id ?? 'single');

  const selectedPurchaseOption = purchaseOptions.find((option) => option.id === activePurchaseId) ?? purchaseOptions[0];

  const handlePayOnline = async () => {
    if (!product || !checkout?.onlinePaymentAvailable) return;
    if (tryOpenTrialCommerceLock()) return;
    if (viewerOwnsProductStore) {
      setPayError('You cannot purchase products from your own store.');
      return;
    }
    setPayError(null);
    const option = purchaseOptions.some((o) => o.id === selectedPackage)
      ? selectedPackage
      : (purchaseOptions[0]?.id ?? 'single');
    try {
      await ensureBuyerDetailsThen(async () => {
        setPayBusy(true);
        try {
          await loadRazorpayCheckoutScript();
          const bd = getBuyerDetails();
          if (!bd || !hasValidBuyerDetails(bd)) throw new Error('Missing buyer details');
          const order = await createProductCheckoutRazorpayOrder(product.id, option, {
            buyer: buyerToCheckoutApiPayload(bd),
          });
          const Razorpay = window.Razorpay;
          if (!Razorpay) throw new Error('Razorpay failed to load.');
          const prefill = razorpayPrefillFromBuyer(bd);
          const rzp = new Razorpay({
            key: order.razorpay_key_id,
            amount: order.amount,
            currency: order.currency,
            name: order.store_name,
            description: `${order.product_name} (${option})`,
            order_id: order.razorpay_order_id,
            prefill,
            handler: async (response: Record<string, string>) => {
              try {
                await verifyProductCheckoutRazorpayPayment(product.id, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                setPayError(null);
                window.alert(
                  'Payment successful. Please save your receipt; the seller will confirm your order (for example via WhatsApp).',
                );
              } catch (err) {
                setPayError(
                  isApiError(err) ? err.message : err instanceof Error ? err.message : 'Could not verify payment',
                );
              } finally {
                setPayBusy(false);
              }
            },
            theme: { color: '#0d9488' },
            modal: {
              ondismiss: () => setPayBusy(false),
            },
          });
          rzp.on('payment.failed', (r: { error?: { description?: string } }) => {
            setPayError(r.error?.description ?? 'Payment failed');
            setPayBusy(false);
          });
          rzp.open();
        } catch (err) {
          setPayError(isApiError(err) ? err.message : err instanceof Error ? err.message : 'Could not start payment');
          setPayBusy(false);
        }
      });
    } catch (err) {
      if (err instanceof Error && err.message === BUYER_DETAILS_GATE_CANCELLED) return;
      setPayError(isApiError(err) ? err.message : err instanceof Error ? err.message : 'Could not start payment');
    }
  };

  const trustHighlights = [
    {
      icon: ShieldCheck,
      title: store?.isVerified ? 'Verified seller' : 'Trusted seller',
      copy: store?.isVerified ? 'Store profile checked by Catelog.' : 'Direct seller assistance available.',
    },
    {
      icon: Truck,
      title: product.inStock ? 'Fast dispatch' : 'Availability support',
      copy: product.inStock ? 'Seller can process active orders quickly.' : 'Stock is confirmed directly with the seller.',
    },
    {
      icon: CreditCard,
      title: 'Safe buying flow',
      copy: 'Compare details, review the seller, and order confidently.',
    },
  ];

  const minOrderQuantity = product?.minOrderQuantity ?? 0;
  const hasMinimumOrderRequirement = minOrderQuantity > 1;
  const minimumOrderLabel = hasMinimumOrderRequirement
    ? `${minOrderQuantity} ${minOrderQuantity === 1 ? 'item' : 'items'}`
    : null;

  const revealParent = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: 0.04 },
    },
  } as const;

  const revealItem = {
    hidden: { opacity: 0, y: 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 380, damping: 32 },
    },
  } as const;

  const detailCards = [
    {
      icon: Package,
      title: 'Minimum order',
      value: `${product.minOrderQuantity ?? 1} ${(product.minOrderQuantity ?? 1) === 1 ? 'item' : 'items'}`,
    },
    {
      icon: Clock3,
      title: 'Availability',
      value: product.inStock ? 'Ready to order now' : 'Available on request',
    },
    {
      icon: Truck,
      title: 'Delivery',
      value: 'Delivery and pickup depend on seller location.',
    },
    {
      icon: ShieldCheck,
      title: 'Support',
      value: 'Direct store support before and after purchase.',
    },
  ];

  return (
    <PublicStorefrontAccessGate store={store} user={user}>
    <div className="min-h-screen bg-slate-50 pb-32">
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 lg:max-w-[80%]">
          <Link href="/" className="inline-flex items-center text-slate-900">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
              <Heart className="h-4 w-4" />
            </button>
            <Link href="/cart" className="rounded-full border border-slate-200 p-2 text-slate-900 transition hover:bg-slate-50">
              <ShoppingCart className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 pb-10 pt-2 sm:px-6 lg:max-w-[80%]">
        <div className="pointer-events-none absolute inset-x-4 -top-8 h-72 overflow-hidden rounded-[3rem] sm:inset-x-6" aria-hidden>
          <motion.div
            className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-teal-400/25 blur-[80px]"
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute right-0 top-12 h-56 w-56 rounded-full bg-indigo-400/20 blur-[72px]"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          className="relative z-10 space-y-6"
          variants={revealParent}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.08 }}
        >
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <motion.section
            variants={revealItem}
            className="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/90 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.06] backdrop-blur-sm"
          >
            <motion.div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(20,184,166,0.12),transparent_55%)]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            />
            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100/90">
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.06, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src={product.image || galleryImages[0]}
                  alt={product.name}
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  priority
                />
              </motion.div>
              <div className="absolute inset-x-0 top-4 flex items-start justify-between px-4">
                <div className="flex flex-col gap-2">
                  <motion.span
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.15 }}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-md backdrop-blur-md ${
                      product.inStock ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
                    }`}
                  >
                    {product.inStock ? 'In stock' : 'Available on request'}
                  </motion.span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md">
                      {product.category}
                    </span>
                    {store?.isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-md">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified store
                      </span>
                    )}
                  </div>
                </div>
                {discount > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.2 }}
                    className="rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg"
                  >
                    Save {discount}%
                  </motion.span>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            variants={revealItem}
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/[0.05] backdrop-blur-md sm:p-6 lg:h-full"
          >
            <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" aria-hidden />
          <div className="relative mt-1 space-y-4">
            {hasMinimumOrderRequirement && minimumOrderLabel && (
              <div className="relative overflow-hidden rounded-full bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700 ring-1 ring-emerald-200">
                <span className="absolute inset-0 animate-[pulse_2s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden="true" />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500/80" aria-hidden="true" />
                    Min order requirement
                  </span>
                  <span className="text-[12px] font-bold tracking-normal text-emerald-800 normal-case">
                    {minimumOrderLabel}
                  </span>
                </span>
              </div>
            )}
            <h1 className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-[clamp(1.65rem,4vw,2rem)] font-bold leading-tight tracking-tight text-transparent sm:text-[2.1rem]">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-primary/30 hover:bg-white">
                <StoreIcon className="h-4 w-4 text-primary/70" />
                {store ? (
                  <Link href={`/store/${store.username}`} className="inline-flex items-center gap-1 font-medium text-slate-800 transition hover:text-primary">
                    {store.name}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">{product.storeName}</span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1.5 shadow-sm">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 transition-transform hover:scale-110 ${star <= Math.round(aggregateRating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-slate-900">{aggregateRating.toFixed(1)}</span>
                <a href="#reviews" className="font-medium text-primary underline-offset-4 transition hover:underline">
                  {(reviewSummary?.totalReviews ?? product.totalReviews).toLocaleString()} reviews
                </a>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <motion.span
                    key={selectedPurchaseOption?.price ?? product.price}
                    initial={{ opacity: 0.5, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="text-4xl font-bold leading-none tracking-tight text-slate-900"
                  >
                    ₹{selectedPurchaseOption ? selectedPurchaseOption.price.toFixed(0) : product.price.toFixed(0)}
                  </motion.span>
                  {product.originalPrice && activePurchaseId === 'single' && (
                    <span className="text-base text-slate-400 line-through">₹{product.originalPrice.toFixed(0)}</span>
                  )}
                </div>
                <p className="mt-1.5 max-w-xs text-sm leading-5 text-slate-500">
                  {formattedUnitLabel ? `Unit: ${formattedUnitLabel}` : 'Final pricing depends on quantity and seller terms.'}
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                className="rounded-2xl bg-gradient-to-br from-teal-50 via-white to-slate-50 px-3 py-3 text-center shadow-inner ring-1 ring-teal-100/80"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-teal-600/80">Seller type</p>
                <p className="mt-1.5 text-[15px] font-semibold leading-5 text-slate-900">
                  {store?.isVerified ? 'Trusted & verified' : 'Direct store listing'}
                </p>
              </motion.div>
            </div>
          </div>

          {product.wholesaleEnabled && product.wholesalePrice && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-teal-500/10 px-4 py-2 text-[11px] font-semibold text-primary shadow-sm"
            >
              <Package className="h-3.5 w-3.5" />
              Wholesale pricing available
            </motion.div>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200/60 bg-gradient-to-b from-slate-50/90 to-white/80 p-4 shadow-inner">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{productDescription}</p>
          </div>
          </motion.section>
        </div>

        <motion.section
          variants={revealItem}
          className="grid grid-cols-3 gap-2 sm:gap-3"
        >
          {trustHighlights.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 380, damping: 28 }}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 18 } }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-2.5 text-center shadow-[0_20px_50px_-18px_rgba(15,23,42,0.45)] ring-1 ring-white/5 sm:rounded-[1.75rem] sm:p-3"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 via-transparent to-indigo-500/10"
                animate={{ opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
              />
              <div className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-teal-300 shadow-inner ring-1 ring-white/10 sm:h-10 sm:w-10 sm:rounded-2xl">
                <item.icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <p className="relative mt-2 text-[11px] font-semibold leading-snug text-white sm:mt-2.5 sm:text-sm">
                {item.title}
              </p>
            </motion.div>
          ))}
        </motion.section>

        <motion.section
          variants={revealItem}
          className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-md sm:p-6"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5 blur-2xl" aria-hidden />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Choose an order option</h2>
              <p className="mt-1 text-sm text-slate-500">Select the quantity or buying mode that fits your order.</p>
            </div>
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
              <Package className="h-6 w-6 text-primary" />
            </motion.div>
          </div>

          <div className="relative mt-4 space-y-3">
            {purchaseOptions.map((option) => (
              <label
                key={option.id}
                className={`group/opt relative flex cursor-pointer items-start justify-between gap-3 overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                  activePurchaseId === option.id
                    ? 'border-primary/50 bg-gradient-to-br from-primary/[0.08] to-teal-500/[0.06] shadow-[0_12px_40px_-16px_rgba(13,148,136,0.35)] ring-2 ring-primary/20'
                    : 'border-slate-200/90 bg-white/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {activePurchaseId === option.id && (
                  <motion.span
                    layoutId="orderOptionGlow"
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/5 via-transparent to-teal-400/5"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <input
                  type="radio"
                  name="orderOption"
                  value={option.id}
                  checked={activePurchaseId === option.id}
                  onChange={() => setSelectedPackage(option.id)}
                  className="sr-only"
                />
                <div className="relative flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${activePurchaseId === option.id ? 'border-primary bg-primary/10' : 'border-slate-300 group-hover/opt:border-slate-400'}`}>
                    {activePurchaseId === option.id && (
                      <motion.div layoutId="orderOptionDot" className="h-2.5 w-2.5 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 28 }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{option.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{option.subtitle}</p>
                    <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      {option.helper}
                    </div>
                  </div>
                </div>
                <div className="relative text-right">
                  <p className="text-lg font-bold text-slate-900">₹{option.price.toFixed(0)}</p>
                </div>
              </label>
            ))}
          </div>
        </motion.section>

        {(checkout?.onlinePaymentAvailable || checkout?.qrPaymentAvailable) && !viewerOwnsProductStore && (
          <motion.section
            variants={revealItem}
            className="relative overflow-hidden rounded-[2rem] border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/40 to-white p-5 shadow-[0_28px_80px_-32px_rgba(13,148,136,0.2)] ring-1 ring-emerald-900/[0.06] backdrop-blur-md sm:p-6"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/10 blur-2xl" aria-hidden />
            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Pay this seller</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {checkout?.onlinePaymentAvailable && checkout?.qrPaymentAvailable
                    ? 'Pay online with UPI or cards, or scan the seller’s QR for the amount below.'
                    : checkout?.onlinePaymentAvailable
                      ? 'Checkout is secured with the seller’s Razorpay account.'
                      : 'Scan the seller’s UPI QR and pay the amount shown for your selected order option.'}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-2 text-right shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Due for selection</p>
                <p className="text-xl font-bold text-slate-900">
                  ₹{selectedPurchaseOption ? selectedPurchaseOption.price.toFixed(0) : product.price.toFixed(0)}
                </p>
              </div>
            </div>

            {checkout?.qrPaymentAvailable && checkout.paymentQrUrl && (
              <div className="relative mt-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-inner">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <QrCode className="h-4 w-4 text-primary" aria-hidden />
                  UPI / QR payment
                </div>
                <p className="mt-1 text-xs text-slate-500">Scan with any UPI app and pay the amount above. Then message the seller on WhatsApp with your payment reference.</p>
                <div className="relative mx-auto mt-4 aspect-square w-full max-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element -- bypass next/image so /store-payment-qr uses Next → Laravel rewrite */}
                  <img
                    src={checkoutQrImageSrc(checkout.paymentQrUrl)}
                    alt="Seller payment QR"
                    className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-2"
                  />
                </div>
              </div>
            )}

            {checkout?.onlinePaymentAvailable && (
              <div className="relative mt-5">
                {payError && <p className="mb-2 text-sm text-rose-600">{payError}</p>}
                <button
                  type="button"
                  onClick={handlePayOnline}
                  disabled={payBusy}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-teal-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-12px_rgba(13,148,136,0.45)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
                >
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {payBusy ? 'Opening checkout…' : 'Pay online (UPI / card)'}
                </button>
              </div>
            )}
          </motion.section>
        )}

        <motion.section variants={revealItem} className="grid grid-cols-2 gap-2 sm:gap-3">
          {detailCards.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 360, damping: 26 }}
              whileHover={{ scale: 1.02, y: -3 }}
              className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-[0_24px_50px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-700/50 sm:rounded-[1.75rem]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/5 text-teal-300 ring-1 ring-white/10 sm:h-11 sm:w-11 sm:rounded-2xl">
                <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-slate-300">{item.value}</p>
            </motion.div>
          ))}
        </motion.section>

        {store && (
          <motion.section
            variants={revealItem}
            className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-md sm:p-6"
          >
            <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" aria-hidden />
            <div className="relative flex items-start gap-4">
              <motion.div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-white shadow-lg"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <img
                  src={store.logo}
                  alt={store.name}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">{store.name}</h2>
                  {store.isVerified && <ShieldCheck className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-sm text-slate-500">{store.location}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {store.shortDescription || store.description || 'Trusted seller profile on Catelog.'}
                </p>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Store rating</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{store.rating.toFixed(1)} / 5</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Reviews</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{store.totalReviews}+ buyers</p>
              </div>
            </div>

            <div className="relative mt-4 flex flex-wrap gap-3">
              <motion.div className="flex min-w-[10rem] flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/store/${store.username}`}
                  className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  Visit store
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </motion.div>
              {sellerPhone && (
                <motion.div className="flex min-w-[10rem] flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <a
                    href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (tryOpenTrialCommerceLock()) e.preventDefault();
                    }}
                    className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-12px_rgba(13,148,136,0.55)] transition hover:brightness-110"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat with seller
                  </a>
                </motion.div>
              )}
            </div>
          </motion.section>
        )}

        {relatedProducts.length > 0 && (
          <motion.section variants={revealItem} className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/[0.04] backdrop-blur-md sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">More from this category</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Related products</h2>
              </div>
              {store && (
                <Link href={`/store/${store.username}`} className="text-sm font-semibold text-primary transition hover:underline">
                  Explore store
                </Link>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {relatedProducts.map((item) => (
                <motion.div key={item.id} whileHover={{ y: -3 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }}>
                  <Link
                    href={`/product/${item.id}`}
                    className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm transition hover:border-primary/25 hover:shadow-lg"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                      <Image src={item.image} alt={item.name} fill className="object-cover transition duration-500 hover:scale-105" />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">₹{item.price.toFixed(0)}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
        </motion.div>
      </div>

      {/* Reviews Section */}
      <section id="reviews" className="relative isolate mt-12">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] shadow-[0_25px_60px_rgba(15,23,42,0.12)] lg:max-w-[80%]">
          <div className="relative">
            <div className="absolute inset-0" style={{ background: reviewColors.gradient }} aria-hidden="true" />
            <div className="relative px-6 py-12 sm:px-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Product reviews</p>
                  <h2 className="text-3xl font-semibold text-slate-900">Loved by buyers of {product.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Average rating {aggregateRating.toFixed(1)} from {reviewSummary?.totalReviews ?? product.totalReviews} orders.
                  </p>
                </div>
                {isLoggedIn ? (
                  <a
                    href="#write-review-form"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_30px_rgba(15,23,42,0.2)]"
                    style={{ backgroundColor: reviewColors.primary }}
                  >
                    Write a review
                  </a>
                ) : (
                  <span className="text-sm text-slate-600">Sign in to share your experience.</span>
                )}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div
                  className="rounded-3xl bg-white/90 p-6 text-slate-900 shadow-sm"
                  style={{ border: `1px solid ${reviewColors.cardBorder}` }}
                >
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Average rating</p>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-6xl font-semibold">{aggregateRating.toFixed(1)}</span>
                    <span className="pb-3 text-sm text-slate-400">/ 5</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-slate-900">
                    <RatingStars rating={aggregateRating} size="md" />
                    <span className="text-sm font-semibold">
                      {totalRecordedReviews || reviewSummary?.totalReviews || product.totalReviews} reviews
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">Based on verified shoppers from {store?.location || 'your city'}.</p>
                </div>

                <div
                  className="rounded-3xl bg-white/90 p-6 shadow-sm lg:col-span-2"
                  style={{ border: `1px solid ${reviewColors.cardBorder}` }}
                >
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratingBreakdown[star as 1 | 2 | 3 | 4 | 5];
                    const percentage = totalRecordedReviews ? (count / totalRecordedReviews) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3 py-1">
                        <span className="w-8 text-sm text-slate-500">{star}.0</span>
                        <div className="h-2 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              background: `linear-gradient(90deg, ${reviewColors.primary}, ${reviewColors.accent})`,
                            }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs text-slate-500">{count} reviews</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {isLoggedIn && (
                <form
                  id="write-review-form"
                  onSubmit={handleSubmitReview}
                  className="mt-8 rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-100"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="text-sm font-semibold text-slate-900">Your rating</label>
                    <RatingStars
                      interactive
                      rating={reviewForm.rating}
                      size="lg"
                      onChange={(value) => handleReviewFormChange({ rating: value })}
                    />
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-semibold text-slate-900" htmlFor="review_comment">
                      Share more about your experience
                    </label>
                    <textarea
                      id="review_comment"
                      rows={4}
                      value={reviewForm.comment}
                      onChange={(event) => handleReviewFormChange({ comment: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                      placeholder="Talk about the product quality, delivery, and support…"
                      required
                    />
                  </div>
                  {reviewError && <p className="mt-3 text-sm text-rose-500">{reviewError}</p>}
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      style={{ backgroundColor: reviewColors.primary }}
                    >
                      {isSubmittingReview ? 'Submitting…' : 'Submit review'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 space-y-4">
                {reviewsLoading && approvedReviews.length === 0 ? (
                  <p className="text-sm text-slate-600">Loading reviews…</p>
                ) : approvedReviews.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
                    Be the first to review this product.
                  </div>
                ) : (
                  approvedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
                )}
              </div>

              {reviewPagination?.hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreReviews}
                    disabled={reviewsLoading}
                    className="inline-flex items-center gap-2 rounded-full border px-6 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{ borderColor: reviewColors.cardBorder, color: '#0f172a' }}
                  >
                    {reviewsLoading ? 'Loading…' : 'Load more reviews'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Selected price</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">
                ₹{selectedPurchaseOption ? selectedPurchaseOption.price.toFixed(0) : product.price.toFixed(0)}
              </span>
              {product.originalPrice && activePurchaseId === 'single' && (
                <span className="text-xs text-slate-400 line-through">₹{product.originalPrice.toFixed(0)}</span>
              )}
            </div>
          </div>
          {sellerPhone || (checkout?.onlinePaymentAvailable && !viewerOwnsProductStore) ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {checkout?.onlinePaymentAvailable && !viewerOwnsProductStore && (
                <button
                  type="button"
                  onClick={handlePayOnline}
                  disabled={payBusy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-900 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                  {payBusy ? '…' : 'Pay online'}
                </button>
              )}
              {sellerPhone ? (
                <>
                  <a
                    href={`tel:${sellerPhone}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                  <a
                    href={`${whatsappLink}?text=Hi%2C%20I'm%20interested%20in%20${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (tryOpenTrialCommerceLock()) e.preventDefault();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,118,110,0.25)]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Order now
                  </a>
                </>
              ) : null}
            </div>
          ) : (
            <a
              href="#reviews"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(15,118,110,0.25)]"
            >
              View reviews
            </a>
          )}
        </div>
      </div>
    </div>
    {buyerDetailsModal}
    </PublicStorefrontAccessGate>
  );
}
