import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { Review } from '@/types';
import RatingStars from './RatingStars';

interface ReviewCardProps {
  review: Review;
  /** Softer card for dark / editorial sections (e.g. store testimonials strip). */
  elevated?: boolean;
}

function isLikelyImageUrl(value: string | undefined): boolean {
  const v = value?.trim();
  if (!v || v.length < 4) return false;
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:') || v.startsWith('/')) {
    return true;
  }
  return false;
}

function reviewerDisplayName(userName: string | undefined) {
  const n = userName?.trim() ?? '';
  if (n === 'Guest (this device)') return 'new users';
  return n || 'Reviewer';
}

const avatarFallbackClass =
  'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-sm ring-2 ring-white';

const avatarFallbackClassMobile =
  'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 shadow-sm ring-1 ring-white';

const avatarImageClass =
  'h-12 w-12 shrink-0 overflow-hidden rounded-full border border-slate-200/90 object-cover shadow-sm ring-2 ring-white';

const avatarImageClassMobile =
  'h-6 w-6 shrink-0 overflow-hidden rounded-full border border-slate-200/90 object-cover shadow-sm ring-1 ring-white';

export default function ReviewCard({ review, elevated = false }: ReviewCardProps) {
  const rawAvatar = review.userAvatar?.trim();
  const canTryImage = isLikelyImageUrl(rawAvatar);
  const [imageFailed, setImageFailed] = useState(false);
  const displayName = reviewerDisplayName(review.userName);
  const reviewerInitial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    setImageFailed(false);
  }, [review.id, rawAvatar]);

  const showPhoto = Boolean(canTryImage && rawAvatar && !imageFailed);
  const reviewedLabel = new Date(review.reviewedAt).toLocaleDateString();

  const renderAvatar = (mobile: boolean) => {
    if (showPhoto) {
      return (
        <img
          src={rawAvatar}
          alt={displayName}
          className={mobile ? avatarImageClassMobile : avatarImageClass}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      );
    }
    return (
      <div
        className={mobile ? avatarFallbackClassMobile : avatarFallbackClass}
        aria-hidden={reviewerInitial ? undefined : true}
      >
        {reviewerInitial ? (
          <span className={mobile ? 'text-[0.5rem] font-bold tracking-tight' : 'text-base font-bold tracking-tight'}>
            {reviewerInitial}
          </span>
        ) : (
          <User className={mobile ? 'h-2.5 w-2.5 text-slate-500' : 'h-5 w-5 text-slate-500'} aria-hidden="true" />
        )}
        <span className="sr-only">Reviewer avatar</span>
      </div>
    );
  };

  const sellerReplyMobile = review.sellerReply ? (
    <div className="mt-2 min-w-0 rounded-lg border-l-4 border-primary bg-gray-50 p-2">
      <p className="mb-1 font-semibold text-[0.6125rem] text-gray-900">Seller Response</p>
      <p className="text-[0.6125rem] leading-snug text-gray-700 [overflow-wrap:anywhere]">
        {review.sellerReply.message}
      </p>
      <p className="mt-1 text-[0.525rem] text-gray-500">
        {review.sellerReply.date
          ? new Date(review.sellerReply.date).toLocaleDateString()
          : new Date(review.reviewedAt).toLocaleDateString()}
      </p>
    </div>
  ) : null;

  return (
    <>
      <div
        className={`sm:hidden w-full ${
          elevated ? 'border-b border-violet-200/60 pb-3 last:border-b-0' : 'border-b border-gray-200 pb-3 last:border-b-0'
        }`}
      >
        <table className="w-full border-collapse text-left">
          <tbody>
            <tr className="align-top">
              <td className="w-9 pr-2 align-top pt-0.5">{renderAvatar(true)}</td>
              <td className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold leading-tight text-[0.7rem] text-gray-900">{displayName}</h4>
                    <p className="mt-0.5 text-[0.525rem] text-gray-500">{reviewedLabel}</p>
                  </div>
                  <div className="shrink-0 origin-right scale-[0.85]">
                    <RatingStars rating={review.rating} size="2xs" />
                  </div>
                </div>
                <p className="mt-1.5 text-[0.6125rem] leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
                  {review.comment}
                </p>
                {sellerReplyMobile}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={`hidden sm:block ${
          elevated
            ? 'rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white via-violet-50/40 to-white p-5 shadow-lg shadow-violet-900/[0.08] ring-1 ring-violet-100/80'
            : 'rounded-lg border border-gray-200 bg-white p-4'
        }`}
      >
        <div className="flex items-start gap-3">
          {renderAvatar(false)}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate font-semibold text-gray-900">{displayName}</h4>
                <p className="text-xs text-gray-500">{reviewedLabel}</p>
              </div>
              <div className="shrink-0">
                <RatingStars rating={review.rating} size="sm" />
              </div>
            </div>

            <p className="mb-3 text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">{review.comment}</p>

            {review.sellerReply && (
              <div className="min-w-0 rounded-lg border-l-4 border-primary bg-gray-50 p-3">
                <p className="mb-1 text-sm font-semibold text-gray-900">Seller Response</p>
                <p className="text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
                  {review.sellerReply.message}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {review.sellerReply.date
                    ? new Date(review.sellerReply.date).toLocaleDateString()
                    : new Date(review.reviewedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
