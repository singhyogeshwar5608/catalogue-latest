"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Clock3,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import type { RatingSummary, Review, ReviewPagination, Service, Store } from "@/types";
import { getServiceById, getStoreReviews, isApiError } from "@/src/lib/api";
import PublicStorefrontAccessGate from "@/components/PublicStorefrontAccessGate";
import { useStorefrontTrialLock } from "@/components/StorefrontTrialLockContext";
import RatingStars from "@/components/RatingStars";
import ReviewCard from "@/components/ReviewCard";
import { useAuth } from "@/src/context/AuthContext";
import { buildReviewColors, getThemeForCategory } from "@/src/lib/reviewTheme";
import { ratingBreakdownFromSummaryOrReviews } from "@/src/lib/reviewRatingBreakdown";
import { isStoreTrialExpiredWithoutPaidPlan } from "@/src/lib/storeAccess";

interface ServicePageProps {
  params: Promise<{ id: string }>;
}

export default function ServiceDetailPage({ params }: ServicePageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<RatingSummary | null>(null);
  const [reviewPagination, setReviewPagination] = useState<ReviewPagination | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);

  useEffect(() => {
    let isMounted = true;
    const fetchService = async () => {
      setLoading(true);
      setError(null);
      try {
        const { service: fetchedService, store: fetchedStore } = await getServiceById(id);
        if (!isMounted) return;
        setService(fetchedService ?? null);
        setStore(fetchedStore);
      } catch (err) {
        if (!isMounted) return;
        if (isApiError(err)) {
          setError(err.message || "Unable to load service");
        } else {
          setError(err instanceof Error ? err.message : "Unable to load service");
        }
        setService(null);
        setStore(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchService();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const wishlistCopy = useMemo(() => {
    if (!service) return "";
    return `Hi, I'm interested in the service "${service.title}". Could you share availability & pricing details?`;
  }, [service]);

  const whatsappLink = useMemo(() => {
    if (!store?.whatsapp) return null;
    return `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, "")}`;
  }, [store?.whatsapp]);

  const theme = useMemo(() => getThemeForCategory(store?.businessType || store?.categoryName), [store?.businessType, store?.categoryName]);
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
  const aggregateRating = reviewSummary?.rating ?? store?.rating ?? 0;

  const viewerOwnsStore = useMemo(
    () =>
      Boolean(
        user?.id &&
          store &&
          ((store.userId && String(user.id) === String(store.userId)) ||
            (user.storeSlug &&
              store.username &&
              user.storeSlug.toLowerCase() === store.username.toLowerCase())),
      ),
    [user?.id, user?.storeSlug, store],
  );

  const trialLock = useStorefrontTrialLock();
  const blockVisitorCommerce = Boolean(
    store && !viewerOwnsStore && isStoreTrialExpiredWithoutPaidPlan(store),
  );

  const tryOpenTrialCommerceLock = () => {
    if (!blockVisitorCommerce) return false;
    trialLock?.openVisitorTrialLock();
    return true;
  };

  const highlights = useMemo(() => {
    const clampScore = (value: number) => Math.min(5, Math.max(1, Number(value.toFixed(1))));
    return [
      { label: "Experience", value: clampScore(aggregateRating + 0.2) },
      { label: "Team", value: clampScore(aggregateRating + 0.1) },
      { label: "Value", value: clampScore(aggregateRating) },
      { label: "Support", value: clampScore(aggregateRating - 0.1) },
      { label: "Reliability", value: clampScore(aggregateRating - 0.2) },
    ];
  }, [aggregateRating]);

  const fetchReviews = useCallback(
    async (storeId: string, page = 1, append = false) => {
      setReviewsLoading(true);
      setReviewError(null);
      try {
        const response = await getStoreReviews(storeId, { page, perPage: 4 });
        setReviewSummary(response.summary);
        setReviewPagination(response.pagination);
        setReviewPage(page);
        setReviews((previous) => (append ? [...previous, ...response.reviews] : response.reviews));
      } catch (err) {
        setReviewError(
          isApiError(err)
            ? err.message || "Unable to load reviews"
            : err instanceof Error
              ? err.message
              : "Unable to load reviews"
        );
      } finally {
        setReviewsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!store?.id) return;
    fetchReviews(store.id, 1);
  }, [store?.id, fetchReviews]);

  const handleLoadMoreReviews = () => {
    if (!store?.id || !reviewPagination?.hasMore || reviewsLoading) return;
    const nextPage = reviewPage + 1;
    fetchReviews(store.id, nextPage, true);
  };

  const serviceHighlights = useMemo(() => {
    if (!service) return [];
    return [
      {
        title: "What you'll get",
        copy: service.description || "Tailored experience curated by our in-house experts.",
        icon: Sparkles,
      },
      {
        title: "Average duration",
        copy: "60 – 90 minutes per session",
        icon: Clock3,
      },
      {
        title: "Guarantee",
        copy: "Catelog verified seller & protected bookings.",
        icon: ShieldCheck,
      },
    ];
  }, [service]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading service…</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Service unavailable</h1>
          <p className="text-slate-600">{error || "This service may have been unpublished."}</p>
        </div>
      </div>
    );
  }

  return (
    <PublicStorefrontAccessGate store={store} user={user}>
    <div className="bg-gradient-to-b from-white via-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image src={service.image} alt={service.title} fill className="object-cover" />
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-xs font-semibold text-slate-900">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Signature service
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs font-semibold text-slate-500">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="block text-slate-900 text-base">₹{service.price ?? "Custom"}</span>
                Pricing
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="block text-slate-900 text-base">{service.isActive ? "Live" : "Hidden"}</span>
                Status
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <span className="block text-slate-900 text-base">Premium</span>
                Category
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-primary">Featured service</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">{service.title}</h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {service.description || "Custom curated experience for modern clients."}
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-600 font-semibold">
                <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                Customer favorite
              </span>
              <span className="text-slate-500">Trusted by {store?.name || service.storeName}</span>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              {serviceHighlights.map((highlight) => (
                <div key={highlight.title} className="flex items-start gap-3">
                  <highlight.icon className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{highlight.title}</p>
                    <p className="text-sm text-slate-600">{highlight.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {store?.whatsapp && whatsappLink && (
                <a
                  href={`${whatsappLink}?text=${encodeURIComponent(wishlistCopy)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (tryOpenTrialCommerceLock()) e.preventDefault();
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_15px_45px_rgba(16,185,129,0.45)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              )}
              {store?.whatsapp && (
                <a
                  href={`tel:${store.whatsapp.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900"
                >
                  <Phone className="h-4 w-4" />
                  Call {store.name}
                </a>
              )}
              {store && (
                <Link
                  href={`/store/${store.username}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  Visit Store
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {store && (
          <section className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">Service details</p>
                  <h3 className="text-xl font-semibold text-slate-900">What to expect</h3>
                </div>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <p>
                  Each booking is managed directly by <span className="font-semibold text-slate-900">{store.name}</span> with dedicated concierge
                  support for custom requirements, travel coordination, and post-service guidance.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Flexible scheduling with priority slots for repeat clients.</li>
                  <li>HD media updates & lookbooks shared before every session.</li>
                  <li>On-site team available across major metro cities.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">Seller</p>
                  <h3 className="text-lg font-semibold text-slate-900">{store.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-100">
                  <img
                    src={store.logo}
                    alt={store.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-sm text-slate-600">
                  <p>{store.location}</p>
                  <p>WhatsApp: {store.whatsapp}</p>
                </div>
              </div>
              <Link href={`/store/${store.username}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                View full store profile
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {store && (
          <section id="reviews" className="mt-12">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
              <div className="relative">
                <div className="absolute inset-0" style={{ background: reviewColors.gradient }} aria-hidden="true" />
                <div className="relative px-6 py-12 sm:px-10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Service reviews</p>
                      <h2 className="text-3xl font-semibold text-slate-900">Clients love {service?.title}</h2>
                      <p className="mt-2 text-sm text-slate-600">
                        Average rating {aggregateRating.toFixed(1)} from {reviewSummary?.totalReviews ?? store.totalReviews} visits.
                      </p>
                    </div>
                    <span className="text-sm text-slate-600">Verified by Catelog shoppers.</span>
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
                          {totalRecordedReviews || reviewSummary?.totalReviews || store.totalReviews} reviews
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">Based on recent sessions in {store.location || "your city"}.</p>
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

                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-900 sm:grid-cols-3 lg:grid-cols-5">
                    {highlights.map((highlight) => (
                      <div
                        key={highlight.label}
                        className="rounded-2xl px-4 py-3 text-center"
                        style={{
                          border: `1px solid ${reviewColors.cardBorder}`,
                          backgroundColor: reviewColors.highlightBg,
                        }}
                      >
                        <p className="text-2xl font-semibold" style={{ color: reviewColors.primary }}>
                          {highlight.value.toFixed(1)}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-slate-700">{highlight.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 space-y-4">
                    {reviewsLoading && approvedReviews.length === 0 ? (
                      <p className="text-sm text-slate-600">Loading reviews…</p>
                    ) : approvedReviews.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-600">
                        This service hasn&apos;t received reviews yet.
                      </div>
                    ) : (
                      approvedReviews.map((review) => <ReviewCard key={review.id} review={review} />)
                    )}
                  </div>

                  {reviewError && <p className="mt-4 text-sm text-rose-500">{reviewError}</p>}

                  {reviewPagination?.hasMore && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={handleLoadMoreReviews}
                        disabled={reviewsLoading}
                        className="inline-flex items-center gap-2 rounded-full border px-6 py-2 text-sm font-semibold disabled:opacity-60"
                        style={{ borderColor: reviewColors.cardBorder, color: "#0f172a" }}
                      >
                        {reviewsLoading ? "Loading…" : "Load more reviews"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
    </PublicStorefrontAccessGate>
  );
}
