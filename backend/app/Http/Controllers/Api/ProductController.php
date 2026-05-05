<?php

namespace App\Http\Controllers\Api;

use App\Actions\ProvisionDefaultFreeStoreSubscription;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Support\NextCatalogCacheInvalidate;
use App\Support\StoreProductListCache;
use App\Support\ProductImageStorage;
use App\Support\SubscriptionPlanProductLimit;
use App\Support\UserFollowNotificationRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    public function publicProductImage(Product $product)
    {
        $rawImage = $product->getRawOriginal('image');
        $relative = ProductImageStorage::relativeManagedPath(is_string($rawImage) ? $rawImage : null);
        if (! is_string($relative) || $relative === '') {
            return response()->json(['message' => 'Product image not found.'], 404);
        }

        if (! Storage::disk(ProductImageStorage::DISK)->exists($relative)) {
            return response()->json(['message' => 'Product image file missing.'], 404);
        }

        $absolute = Storage::disk(ProductImageStorage::DISK)->path($relative);
        $mime = Storage::disk(ProductImageStorage::DISK)->mimeType($relative) ?: 'application/octet-stream';

        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    public function addProduct(Request $request)
    {
        $user = $request->user();
        $requestedStoreId = $request->input('store_id');

        if (is_numeric($requestedStoreId)) {
            $store = $user->stores()->whereKey((int) $requestedStoreId)->first();
        } else {
            // Without `store_id`, `first()` is ambiguous for multi-store accounts; prefer the most recently updated store.
            $store = $user->stores()->orderByDesc('updated_at')->orderByDesc('id')->first();
        }

        if (! $store) {
            return $this->errorResponse('You must create a store before adding products.', 409);
        }

        if ($store->isPublicCatalogLocked()) {
            return $this->errorResponse(
                'Your store catalog is paused until you renew your plan. You can still use the dashboard, but new products cannot be added yet.',
                403
            );
        }

        if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
            $store->loadMissing('activeSubscription.plan');
            $activeSub = $store->activeSubscription;
            if (! $activeSub || ! $activeSub->plan) {
                ProvisionDefaultFreeStoreSubscription::run($store, (int) $user->id);
                $store->loadMissing('activeSubscription.plan');
                $activeSub = $store->activeSubscription;
            }
            if ($activeSub && $activeSub->plan) {
                $maxProducts = SubscriptionPlanProductLimit::resolve($activeSub->plan);
                $currentCount = $store->products()->count();
                if ($maxProducts < SubscriptionPlanProductLimit::UNLIMITED && $currentCount >= $maxProducts) {
                    return $this->errorResponse(
                        "You have reached your plan limit ({$maxProducts} products). Upgrade your subscription to add more products.",
                        403
                    );
                }
            }
        }

        // Dashboard product form is intentionally permissive: store owners may enter any values.
        // We still normalize a couple of DB-required fields (title, price) before persistence.
        $money = 'nullable|numeric|min:0|max:9999999999.99';

        $validator = Validator::make($request->all(), [
            'store_id' => 'nullable',
            'title' => 'nullable',
            'price' => $money,
            'original_price' => $money,
            'category' => 'nullable',
            'description' => 'nullable',
            'is_active' => 'nullable',
            'unit_type' => 'nullable',
            'unit_custom_label' => 'nullable',
            'unit_quantity' => 'nullable|numeric|min:0|max:999999.99',
            'wholesale_enabled' => 'nullable',
            'wholesale_price' => $money,
            'wholesale_min_qty' => 'nullable|integer|min:0|max:2147483647',
            'min_order_quantity' => 'nullable|integer|min:0|max:2147483647',
            'discount_enabled' => 'nullable',
            'discount_price' => $money,
            'discount_schedule_enabled' => 'nullable',
            'discount_starts_at' => 'nullable',
            'discount_ends_at' => 'nullable',
            'images' => 'nullable',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->hasFile('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->file('image')],
                ['image' => 'required|image|max:5120']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        } elseif ($request->filled('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->input('image')],
                ['image' => 'string|max:4000000']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        }

        $data = $validator->validated();
        unset($data['images']);

        $titleRaw = $request->input('title');
        $title = is_string($titleRaw) ? trim($titleRaw) : '';
        $data['title'] = $title !== '' ? mb_substr($title, 0, 255) : 'Untitled product';

        $priceRaw = $request->input('price');
        $data['price'] = is_numeric($priceRaw) ? (float) $priceRaw : 0;

        $origRaw = $request->input('original_price');
        $data['original_price'] = is_numeric($origRaw) ? (float) $origRaw : null;

        $data['image'] = $this->resolveIncomingPrimaryImage($request, null);
        if ($request->has('images')) {
            $data['images'] = $this->normalizeImagesArrayForPersistence($request->input('images', []));
        }

        $product = $store->products()->create($data);

        UserFollowNotificationRecorder::newProduct($store, $product);

        StoreProductListCache::bump((int) $store->id);
        NextCatalogCacheInvalidate::products();

        $fresh = $product->fresh();
        if ($fresh) {
            ProductImageStorage::decorateProductForResponse($fresh);
        }

        return $this->successResponse('Product created successfully.', $fresh);
    }

    public function updateProduct(Request $request, int $id)
    {
        $product = Product::query()->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to update this product.', 403);
        }

        $product->loadMissing('store');
        if ($product->store->isPublicCatalogLocked()) {
            return $this->errorResponse(
                'Your store catalog is paused until you renew your plan. Product updates are not available yet.',
                403
            );
        }

        $previousImage = $product->getAttributes()['image'] ?? null;

        $money = 'nullable|numeric|min:0|max:9999999999.99';

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|nullable',
            'price' => 'sometimes|nullable|numeric|min:0|max:9999999999.99',
            'original_price' => $money,
            'category' => 'nullable',
            'description' => 'nullable',
            'is_active' => 'nullable',
            'unit_type' => 'nullable',
            'unit_custom_label' => 'nullable',
            'unit_quantity' => 'nullable|numeric|min:0|max:999999.99',
            'wholesale_enabled' => 'nullable',
            'wholesale_price' => $money,
            'wholesale_min_qty' => 'nullable|integer|min:0|max:2147483647',
            'min_order_quantity' => 'nullable|integer|min:0|max:2147483647',
            'discount_enabled' => 'nullable',
            'discount_price' => $money,
            'discount_schedule_enabled' => 'nullable',
            'discount_starts_at' => 'nullable',
            'discount_ends_at' => 'nullable',
            'images' => 'nullable',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->hasFile('image')) {
            $imgValidator = Validator::make(
                ['image' => $request->file('image')],
                ['image' => 'required|image|max:5120']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        } elseif ($request->exists('image') && $request->input('image') !== null && $request->input('image') !== '') {
            $imgValidator = Validator::make(
                ['image' => $request->input('image')],
                ['image' => 'string|max:4000000']
            );
            if ($imgValidator->fails()) {
                return $this->errorResponse('Validation failed.', 422, $imgValidator->errors());
            }
        }

        $data = $validator->validated();

        if (array_key_exists('title', $data)) {
            $raw = $request->input('title');
            $t = is_string($raw) ? trim($raw) : '';
            $data['title'] = $t !== '' ? mb_substr($t, 0, 255) : 'Untitled product';
        }
        if (array_key_exists('price', $data)) {
            $raw = $request->input('price');
            $data['price'] = is_numeric($raw) ? (float) $raw : 0;
        }
        if (array_key_exists('original_price', $data)) {
            $raw = $request->input('original_price');
            $data['original_price'] = is_numeric($raw) ? (float) $raw : null;
        }

        if (array_key_exists('images', $data)) {
            $data['images'] = $this->normalizeImagesArrayForPersistence($request->input('images', []));
        }

        if ($request->hasFile('image')) {
            $data['image'] = ProductImageStorage::storeUploaded($request->file('image'));
            ProductImageStorage::deleteStoredIfManaged($previousImage);
        } elseif ($request->exists('image')) {
            $raw = $request->input('image');
            if ($raw === null || $raw === '') {
                ProductImageStorage::deleteStoredIfManaged($previousImage);
                $data['image'] = null;
            } else {
                $data['image'] = ProductImageStorage::persistIncomingImage(
                    is_string($raw) ? $raw : '',
                    $previousImage
                );
            }
        }

        $product->update($data);

        StoreProductListCache::bump((int) $product->store_id);
        NextCatalogCacheInvalidate::products();

        $fresh = $product->fresh();
        if ($fresh) {
            ProductImageStorage::decorateProductForResponse($fresh);
        }

        return $this->successResponse('Product updated successfully.', $fresh);
    }

    public function deleteProduct(Request $request, int $id)
    {
        $product = Product::query()->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        if ($request->user()->id !== $product->store->user_id) {
            return $this->errorResponse('You are not authorized to delete this product.', 403);
        }

        $storeId = (int) $product->store_id;
        $prevImage = $product->getAttributes()['image'] ?? null;
        ProductImageStorage::deleteStoredIfManaged($prevImage);

        $product->delete();

        StoreProductListCache::bump($storeId);
        NextCatalogCacheInvalidate::products();

        return $this->successResponse('Product deleted successfully.');
    }

    /**
     * Public home/marketing rail: latest active products across stores (no pagination).
     */
    public function trendingProducts(Request $request)
    {
        $limit = max(1, min(50, (int) $request->integer('limit', 20)));
        /** `v2` adds store lat/lng for client distance chips (invalidate stale cache). */
        $cacheKey = 'products_trending:v2:'.$limit;

        $load = function () use ($limit) {
            $rows = Product::query()
                ->select(Product::LIST_COLUMNS)
                ->where('is_active', true)
                ->whereHas('store', function ($s) {
                    $s->where('is_active', true);
                })
                ->with(['store' => function ($q) {
                    $q->select([
                        'id',
                        'name',
                        'slug',
                        'username',
                        'whatsapp',
                        'phone',
                        'location',
                        'latitude',
                        'longitude',
                        'business_type',
                        'category_id',
                        'is_verified',
                        'is_boosted',
                        'is_active',
                    ]);
                }])
                ->orderByDesc('id')
                ->limit($limit)
                ->get();

            foreach ($rows as $product) {
                if ($product instanceof Product) {
                    ProductImageStorage::decorateProductForResponse($product);
                }
            }

            return $rows;
        };

        try {
            $rows = Cache::remember($cacheKey, 60, $load);
        } catch (\Throwable) {
            $rows = $load();
        }

        return $this->successResponse('Trending products', $rows);
    }

    /**
     * Paginated, cached product list with explicit column selection and public image URLs.
     */
    public function getProductsByStore(Request $request, int $storeId)
    {
        $store = Store::query()->find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $perPage = (int) $request->query('per_page', 15);
        $perPage = max(1, min(100, $perPage));

        $version = 0;
        $storeCacheRow = Store::query()->select(['id', 'updated_at'])->whereKey($storeId)->first();
        if (Schema::hasColumn('stores', 'product_list_cache_version') && $storeCacheRow) {
            $version = (int) (Store::query()->whereKey($storeId)->value('product_list_cache_version') ?? 0);
        }
        $updatedToken = $storeCacheRow?->updated_at?->timestamp ?? 0;

        $cacheKey = "products:store:{$storeId}:v{$version}:u{$updatedToken}:page:{$page}:per:{$perPage}";

        $loadPage = function () use ($storeId, $page, $perPage) {
            $p = Product::query()
                ->select(Product::LIST_COLUMNS)
                ->where('store_id', $storeId)
                ->orderByDesc('created_at')
                ->paginate($perPage, ['*'], 'page', $page);

            $p->getCollection()->transform(function (Product $product) {
                ProductImageStorage::decorateProductForResponse($product);

                return $product;
            });

            return $p;
        };

        try {
            $paginator = Cache::remember($cacheKey, 60, $loadPage);
        } catch (\Throwable) {
            $paginator = $loadPage();
        }

        return $this->successResponse('Products retrieved successfully.', $paginator);
    }

    public function getProductById(Request $request, int $id)
    {
        $storeWith = ['store.category'];
        if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
            $storeWith[] = 'store.activeSubscription.plan';
        }

        $product = Product::query()
            ->select(Product::LIST_COLUMNS)
            ->with($storeWith)
            ->find($id);

        if (! $product) {
            return $this->errorResponse('Product not found.', 404);
        }

        ProductImageStorage::decorateProductForResponse($product);

        $payload = $product->toArray();
        $payload['checkout'] = ProductCheckoutController::buildPublicCheckoutPayload($product, $request);

        return $this->successResponse('Product retrieved successfully.', $payload);
    }

    private function resolveIncomingPrimaryImage(Request $request, ?string $previous): ?string
    {
        if ($request->hasFile('image')) {
            return ProductImageStorage::storeUploaded($request->file('image'));
        }
        if ($request->filled('image')) {
            return ProductImageStorage::persistIncomingImage($request->string('image')->toString(), $previous);
        }

        return null;
    }

    /**
     * @param  array<int, mixed>  $images
     * @return array<int, string>
     */
    private function normalizeImagesArrayForPersistence(array $images): array
    {
        $out = [];
        foreach ($images as $item) {
            if (! is_string($item)) {
                continue;
            }
            $trimmed = trim($item);
            if ($trimmed === '') {
                continue;
            }
            $saved = ProductImageStorage::persistIncomingImage($trimmed, null);
            if ($saved !== null) {
                $out[] = $saved;
            }
        }

        return array_values($out);
    }
}
