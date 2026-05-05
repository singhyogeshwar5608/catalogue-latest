import type { RatingSummary, Review } from '@/types';

type StarKey = 1 | 2 | 3 | 4 | 5;

const emptyCounts = (): Record<StarKey, number> => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

/**
 * Prefer full-catalog counts from the API (`summary.distribution`), else derive from the
 * loaded review list (paginated — only accurate when all pages are loaded).
 */
export function ratingBreakdownFromSummaryOrReviews(
  summary: RatingSummary | undefined | null,
  approvedReviews: Review[]
): Record<StarKey, number> {
  const d = summary?.distribution;
  if (d && typeof d === 'object') {
    const out = emptyCounts();
    let hasAny = false;
    for (let s = 1; s <= 5; s++) {
      const key = s as StarKey;
      const raw = d[key];
      if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
        out[key] = Math.trunc(raw);
        hasAny = true;
      }
    }
    if (hasAny) {
      return out;
    }
  }

  const counts = emptyCounts();
  approvedReviews.forEach((review) => {
    const star = Math.min(5, Math.max(1, Math.round(review.rating || 0))) as StarKey;
    counts[star] += 1;
  });
  return counts;
}
