<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    public function listProductReviews(Request $request, int $productId)
    {
        $product = Product::find($productId);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        $perPage = $this->sanitizePerPage($request->integer('per_page', 10));

        $reviews = Review::with('user')
            ->where('product_id', $product->id)
            ->where('is_approved', true)
            ->orderByDesc('reviewed_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->successResponse('Product reviews retrieved successfully.', $this->buildReviewPayload(
            $reviews,
            (float) $product->rating,
            (int) $product->total_reviews,
            $this->approvedRatingStarCounts('product_id', (int) $product->id)
        ));
    }

    public function listStoreReviews(Request $request, int $storeId)
    {
        $store = Store::find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $perPage = $this->sanitizePerPage($request->integer('per_page', 10));

        $reviews = Review::with('user')
            ->where('store_id', $store->id)
            ->where('is_approved', true)
            ->orderByDesc('reviewed_at')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return $this->successResponse('Store reviews retrieved successfully.', $this->buildReviewPayload(
            $reviews,
            (float) $store->rating,
            (int) $store->total_reviews,
            $this->approvedRatingStarCounts('store_id', (int) $store->id)
        ));
    }

    public function submitProductReview(Request $request, int $productId)
    {
        $product = Product::with('store')->find($productId);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:5|max:2000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $user = $request->user();
        $data = $validator->validated();

        $review = Review::updateOrCreate(
            [
                'user_id' => $user->id,
                'product_id' => $product->id,
            ],
            [
                'store_id' => $product->store_id,
                'user_name' => $user->name ?? 'Anonymous',
                'user_avatar' => $user->avatar_url,
                'rating' => $data['rating'],
                'comment' => $data['comment'],
                'reviewed_at' => now(),
                'is_approved' => true,
            ]
        );

        $review->loadMissing('user');

        $product = $this->refreshProductMetrics($product);
        $store = $this->refreshStoreMetrics($product->store ?? Store::find($product->store_id));

        return $this->successResponse('Review submitted successfully.', [
            'review' => $this->formatReview($review),
            'summary' => [
                'product_rating' => (float) $product->rating,
                'product_reviews' => (int) $product->total_reviews,
                'store_rating' => (float) $store->rating,
                'store_reviews' => (int) $store->total_reviews,
            ],
        ]);
    }

    public function submitStoreReview(Request $request, int $storeId)
    {
        $store = Store::find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:5|max:2000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $user = $request->user();
        $data = $validator->validated();

        $review = Review::updateOrCreate(
            [
                'user_id' => $user->id,
                'store_id' => $store->id,
                'product_id' => null,
            ],
            [
                'user_name' => $user->name ?? 'Anonymous',
                'user_avatar' => $user->avatar_url,
                'rating' => $data['rating'],
                'comment' => $data['comment'],
                'reviewed_at' => now(),
                'is_approved' => true,
            ]
        );

        $review->loadMissing('user');

        $store = $this->refreshStoreMetrics($store);

        return $this->successResponse('Review submitted successfully.', [
            'review' => $this->formatReview($review),
            'summary' => [
                'store_rating' => (float) $store->rating,
                'store_reviews' => (int) $store->total_reviews,
            ],
        ]);
    }

    /**
     * @param  array<int|string, int>|null  $ratingDistribution  Keys 1–5 => count of approved reviews with that rating.
     */
    private function buildReviewPayload(LengthAwarePaginator $reviews , float $average, int $count, ?array $ratingDistribution = null): array
    {
        $summary = [
            'rating' => round($average, 1),
            'total_reviews' => $count,
        ];
        if ($ratingDistribution !== null) {
            $summary['rating_distribution'] = $ratingDistribution;
        }

        return [
            'summary' => $summary,
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'has_more' => $reviews->hasMorePages(),
            ],
            'reviews' => array_map(fn ($review) => $this->formatReview($review), $reviews->items()),
        ];
    }

    /**
     * @return array<string, int> JSON keys "1".."5" for predictable client parsing.
     */
    private function approvedRatingStarCounts(string $scopeColumn, int $scopeId): array
    {
        $raw = Review::query()
            ->where($scopeColumn, $scopeId)
            ->where('is_approved', true)
            ->selectRaw('rating, COUNT(*) as aggregate')
            ->groupBy('rating')
            ->pluck('aggregate', 'rating');

        $out = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        foreach ($raw as $rating => $count) {
            $r = (int) $rating;
            if ($r >= 1 && $r <= 5) {
                $out[$r] = (int) $count;
            }
        }

        return [
            '1' => $out[1],
            '2' => $out[2],
            '3' => $out[3],
            '4' => $out[4],
            '5' => $out[5],
        ];
    }

    private function formatReview(Review $review): array
    {
        $user = $review->user;

        return [
            'id' => $review->id,
            'store_id' => $review->store_id,
            'product_id' => $review->product_id,
            'rating' => (int) $review->rating,
            'comment' => $review->comment,
            'reviewed_at' => optional($review->reviewed_at)->toDateString() ?? $review->created_at?->toDateString(),
            'user' => [
                'id' => $user?->id,
                'name' => $review->user_name,
                'avatar' => $review->user_avatar ?? $user?->avatar_url,
            ],
            'seller_reply' => $review->seller_reply,
        ];
    }

    private function refreshProductMetrics(Product $product): Product
    {
        $metrics = Review::selectRaw('COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews')
            ->where('product_id', $product->id)
            ->where('is_approved', true)
            ->first();

        $product->update([
            'rating' => round((float) ($metrics->avg_rating ?? 0), 1),
            'total_reviews' => (int) ($metrics->total_reviews ?? 0),
        ]);

        return $product->fresh();
    }

    private function refreshStoreMetrics(?Store $store): Store
    {
        if (! $store) {
            throw new \RuntimeException('Store not found while refreshing metrics.');
        }

        $metrics = Review::selectRaw('COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews')
            ->where('store_id', $store->id)
            ->where('is_approved', true)
            ->first();

        $store->update([
            'rating' => round((float) ($metrics->avg_rating ?? 0), 1),
            'total_reviews' => (int) ($metrics->total_reviews ?? 0),
        ]);

        return $store->fresh();
    }

    private function sanitizePerPage(?int $perPage): int
    {
        $perPage = $perPage ?? 10;

        return max(5, min(50, $perPage));
    }
}
