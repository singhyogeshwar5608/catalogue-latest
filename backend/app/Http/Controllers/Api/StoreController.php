<?php

namespace App\Http\Controllers\Api;

use App\Actions\ProvisionDefaultFreeStoreSubscription;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\PlatformSetting;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreFollow;
use App\Support\ImageCompression;
use App\Support\NextCatalogCacheInvalidate;
use App\Support\StoresListingCache;
use App\Support\ProductImageStorage;
use App\Support\SearchEngineIndexer;
use App\Support\StoreLogoUrl;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class StoreController extends Controller
{
    /**
     * Public store listing: cached 60s (reduces MySQL load on shared hosting).
     * Eager-loads `category` with admin banner URLs so home / all-stores cards can show
     * per-category banners (same source as the admin Categories screen).
     */
    public function listStores(Request $request)
    {
        $limit = max(1, min(100, (int) $request->integer('limit', 50)));
        $paidSubscriptionOnly = $request->boolean('paid_subscription');
        $cacheKey = 'stores_list:v3:'.StoresListingCache::nonce().':'.md5($request->getQueryString() ?: 'default');

        $userLat = null;
        $userLng = null;
        if ($request->filled('lat') && $request->filled('lng')) {
            $la = filter_var($request->query('lat'), FILTER_VALIDATE_FLOAT);
            $ln = filter_var($request->query('lng'), FILTER_VALIDATE_FLOAT);
            if ($la !== false && $ln !== false && $la >= -90 && $la <= 90 && $ln >= -180 && $ln <= 180) {
                $userLat = (float) $la;
                $userLng = (float) $ln;
            }
        }

        $runQuery = function () use ($limit, $paidSubscriptionOnly, $userLat, $userLng) {
            $q = Store::query()->with(['category' => $this->categoryRelationWithBanners()]);
            if ($paidSubscriptionOnly) {
                $q->where('is_active', true);
                if (
                    \Illuminate\Support\Facades\Schema::hasTable('store_subscriptions')
                    && \Illuminate\Support\Facades\Schema::hasTable('subscription_plans')
                ) {
                    $q->whereHas('activeSubscription', function ($sub) {
                        $sub->where('status', 'active')
                            ->where('ends_at', '>', now())
                            ->whereHas('plan', function ($plan) {
                                $plan->where('slug', '!=', 'free');
                            });
                    });
                } else {
                    return collect();
                }
            }

            $stores = $q->orderByDesc('id')->limit($limit)->get();

            if ($userLat !== null && $userLng !== null) {
                foreach ($stores as $store) {
                    if ($store->latitude !== null && $store->longitude !== null) {
                        $store->setAttribute('distance_km', $this->haversineDistanceKm(
                            $userLat,
                            $userLng,
                            (float) $store->latitude,
                            (float) $store->longitude
                        ));
                    }
                }
            }

            return $this->applyCategoryBannerData($stores);
        };

        try {
            $stores = Cache::remember($cacheKey, 60, $runQuery);

            return $this->successResponse('Stores retrieved successfully.', $stores);
        } catch (\Throwable $e) {
            Log::error('listStores', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            try {
                $stores = $runQuery();

                return $this->successResponse('Stores retrieved successfully.', $stores);
            } catch (\Throwable) {
                return $this->successResponse('Stores retrieved successfully.', collect());
            }
        }
    }

    /**
     * Build a geocoding query that is stable and unambiguous.
     * Many users fill district/state but leave `location` blank; without coords we can't show distance on the frontend.
     *
     * @param  array<string, mixed>  $data
     */
    private function buildGeocodeQuery(array $data, ?Store $store = null): ?string
    {
        $pick = function (string $key) use ($data, $store): ?string {
            $v = $data[$key] ?? ($store?->{$key} ?? null);
            if (! is_string($v)) return null;
            $t = trim($v);
            return $t !== '' ? $t : null;
        };

        $district = $pick('district');
        $state = $pick('state');
        $location = $pick('location');
        $address = $pick('address');

        // Most reliable: district + state.
        if ($district && $state) {
            return "{$district}, {$state}, India";
        }
        if ($district) {
            return "{$district}, India";
        }
        if ($location) {
            return str_contains($location, 'India') ? $location : "{$location}, India";
        }
        if ($address) {
            return str_contains($address, 'India') ? $address : "{$address}, India";
        }
        return null;
    }

    /**
     * @return list<string>
     */
    private function storeSubscriptionEagerStrings(): array
    {
        return ['activeBoost.plan', 'activeSubscription.plan'];
    }

    /**
     * Active stores the viewer follows (Bearer JWT → u:id, or guest_token), most recently followed first.
     */
    public function followingStores(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $actorKey = app(StoreEngagementController::class)->resolveActorKey($request);
        } catch (\Throwable $e) {
            Log::warning('followingStores: actor', ['message' => $e->getMessage()]);

            return $this->successResponse('Stores you follow', ['stores' => []]);
        }

        if ($actorKey === null) {
            return $this->successResponse('Stores you follow', ['stores' => []]);
        }

        try {
            $idsOrdered = StoreFollow::query()
                ->where('actor_key', $actorKey)
                ->orderByDesc('updated_at')
                ->pluck('store_id')
                ->unique()
                ->values()
                ->all();
        } catch (\Throwable $e) {
            Log::warning('followingStores: store_follows', ['message' => $e->getMessage()]);

            return $this->successResponse('Stores you follow', ['stores' => []]);
        }

        if ($idsOrdered === []) {
            return $this->successResponse('Stores you follow', ['stores' => []]);
        }

        try {
            $stores = Store::query()
                ->whereIn('id', $idsOrdered)
                ->where('is_active', true)
                ->with(['category' => $this->categoryRelationWithBanners()])
                ->orderByDesc('id')
                ->get();
        } catch (\Throwable $e) {
            try {
                $stores = Store::query()
                    ->whereIn('id', $idsOrdered)
                    ->with(['category' => $this->categoryRelationWithBanners()])
                    ->orderByDesc('id')
                    ->get();
            } catch (\Throwable $e2) {
                Log::error('followingStores: store query', [
                    'message' => $e2->getMessage(),
                ]);

                return $this->successResponse('Stores you follow', ['stores' => []]);
            }
        }

        $byId = $stores->keyBy('id');
        $ordered = collect($idsOrdered)
            ->map(fn ($id) => $byId->get($id))
            ->filter()
            ->values();

        $ordered = $this->applyCategoryBannerData($ordered);

        foreach ($ordered as $store) {
            try {
                $viewer = StoreEngagementController::viewerEngagementFor($store, $request);
                $store->setAttribute('viewer_following', $viewer['viewer_following']);
                $store->setAttribute('viewer_liked', $viewer['viewer_liked']);
            } catch (\Throwable) {
            }
        }

        return $this->successResponse('Stores you follow', $ordered);
    }

    public function myStores(Request $request)
    {
        $user = $request->user();
        \Log::info('myStores called', ['user_id' => $user->id, 'user_email' => $user->email, 'role' => $user->role]);

        // For super admin, show all stores
        // For regular users, show only their stores
        if ($user->role === 'super_admin') {
            \Log::info('Executing admin branch - showing all stores');
            $stores = \App\Models\Store::with([
                'category' => $this->categoryRelationWithBanners(),
                'user',
                'activeSubscription.plan',
            ])
                ->orderByDesc('created_at')
                ->get();
        } else {
            \Log::info('Executing user branch - showing only user stores');
            $stores = $user
                ->stores()
                ->with(['category' => $this->categoryRelationWithBanners(), 'activeSubscription.plan'])
                ->orderByDesc('created_at')
                ->get();
        }

        \Log::info('Stores query executed', ['count' => $stores->count()]);

        \Log::info('Before applyCategoryBannerData', ['stores' => $stores->pluck('id')->toArray()]);
        $stores = $this->applyCategoryBannerData($stores);
        \Log::info('After applyCategoryBannerData', ['count' => $stores->count(), 'stores' => $stores->pluck('id')->toArray()]);

        \Log::info('Returning user stores', ['count' => $stores->count()]);

        return $this->successResponse('User stores retrieved successfully.', $stores);
    }

    public function createStore(Request $request)
    {
        try {
            return $this->createStoreOrFail($request);
        } catch (Throwable $e) {
            Log::error('createStore failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            $msg = 'Store could not be created. Check `storage/logs/laravel.log` on the server and that database migrations are up to date.';
            if (config('app.debug')) {
                $msg = $e->getMessage().' ('.basename($e->getFile()).':'.$e->getLine().')';
            }

            return $this->errorResponse($msg, 500, config('app.debug') ? ['exception' => get_class($e)] : null);
        }
    }

    private function createStoreOrFail(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->errorResponse('Unauthenticated.', 401);
        }

        $rawLogo = $request->input('logo');
        if (is_string($rawLogo) && strlen($rawLogo) > 2_500_000) {
            return $this->errorResponse(
                'Logo image is too large. Please use a smaller image (under about 1.5 MB) or a lower resolution.',
                422
            );
        }

        // Enforce single store per user
        if ($user->stores()->exists()) {
            return $this->errorResponse('You already have a store. Only one store per user is allowed.', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:stores,slug',
            'category_id' => 'required|exists:categories,id',
            'logo' => 'nullable|string|max:4000000',
            'phone' => 'nullable|string|max:50',
            'email' => 'required|email|max:255',
            'show_phone' => 'nullable|boolean',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'seo_keywords' => 'nullable|string|max:4000',
            'keywords' => 'nullable|string|max:4000',
            'location' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:120',
            'district' => 'nullable|string|max:120',
            'facebook_url' => 'nullable|url|max:255',
            'instagram_url' => 'nullable|url|max:255',
            'youtube_url' => 'nullable|url|max:255',
            'linkedin_url' => 'nullable|url|max:255',
        ]);

        if ($validator->fails()) {
            \Log::error('Store validation failed', ['errors' => $validator->errors()->toArray()]);

            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $logoFromRequest = $data['logo'] ?? null;
        unset($data['logo']);
        $data['seo_keywords'] = $this->normalizeStoreKeywords(
            $data['seo_keywords'] ?? $data['keywords'] ?? null,
            $data['name'] ?? null,
            $data['location'] ?? null
        );
        unset($data['keywords']);

        if (array_key_exists('state', $data) && is_string($data['state'])) {
            $data['state'] = trim($data['state']) ?: null;
        }
        if (array_key_exists('district', $data) && is_string($data['district'])) {
            $data['district'] = trim($data['district']) ?: null;
        }

        // Slug / username: include district for SEO when provided (e.g. rahul-fashion-kaithal).
        $districtForSlug = $data['district'] ?? null;
        if (empty($data['slug'] ?? null)) {
            $baseSlug = Str::slug($data['name']);
            if (is_string($districtForSlug) && $districtForSlug !== '') {
                $baseSlug .= '-'.Str::slug($districtForSlug);
            }
            if ($baseSlug === '') {
                $baseSlug = 'store';
            }
            $data['slug'] = $this->generateUniqueSlug($baseSlug);
        } else {
            $data['slug'] = $this->generateUniqueSlug($data['slug']);
        }

        $userBase = Str::slug($data['name']);
        if (is_string($districtForSlug) && $districtForSlug !== '') {
            $userBase .= '-'.Str::slug($districtForSlug);
        }
        $data['username'] = $this->generateUniqueUsername($userBase.'-'.$user->id);
        $data['user_id'] = $user->id;

        if ((! isset($data['latitude']) || $data['latitude'] === null) && (! isset($data['longitude']) || $data['longitude'] === null)) {
            $coordinates = $this->geocodeLocation($this->buildGeocodeQuery($data));
            if ($coordinates) {
                [$data['latitude'], $data['longitude']] = $coordinates;
            }
        }

        $trialDays = PlatformSetting::freeTrialDays();

        $rowData = $this->dataForStoreInsert($data);
        $requiredInsert = ['user_id', 'category_id', 'name', 'slug', 'username', 'email'];
        foreach ($requiredInsert as $col) {
            if (! array_key_exists($col, $rowData) || $rowData[$col] === null || $rowData[$col] === '') {
                Log::error('createStore: rowData missing required field after dataForStoreInsert', [
                    'col' => $col,
                    'row_keys' => array_keys($rowData),
                ]);

                return $this->errorResponse(
                    'Server could not prepare store data. Ensure the `stores` table includes all required columns (run `php artisan migrate`).',
                    500
                );
            }
        }

        $store = DB::transaction(function () use ($rowData, $user, $trialDays, $logoFromRequest) {
            $store = Store::create($rowData);
            $store->refresh();

            try {
                DB::table('stores')->where('id', $store->id)->update([
                    'trial_ends_at' => $store->created_at->copy()->addDays($trialDays),
                ]);
            } catch (Throwable $e) {
                Log::warning('createStore: trial_ends_at DB update failed', [
                    'store_id' => $store->id,
                    'message' => $e->getMessage(),
                ]);
            }
            $store->refresh();

            if (is_string($logoFromRequest) && $logoFromRequest !== '') {
                try {
                    $resolvedLogo = $this->normalizeStoreLogoForPersistence($logoFromRequest);
                    if ($resolvedLogo !== null && $resolvedLogo !== '') {
                        $store->update(['logo' => $resolvedLogo]);
                    }
                } catch (Throwable $e) {
                    Log::warning('createStore: logo could not be saved; store created without custom logo', [
                        'store_id' => $store->id,
                        'message' => $e->getMessage(),
                    ]);
                }
                $store->refresh();
            }

            try {
                ProvisionDefaultFreeStoreSubscription::run($store, (int) $user->id);
            } catch (Throwable $e) {
                Log::error('ProvisionDefaultFreeStoreSubscription failed during createStore', [
                    'message' => $e->getMessage(),
                    'store_id' => $store->id,
                    'user_id' => $user->id,
                ]);
            }

            $store->load(['category']);

            $category = $store->category;
            $businessType = $category?->business_type ?? 'product';
            try {
                $store->update([
                    'theme' => match ($businessType) {
                        'service' => 'service-default',
                        'hybrid' => 'hybrid-default',
                        default => 'product-default',
                    },
                ]);
            } catch (Throwable $e) {
                Log::warning('createStore: theme update skipped', [
                    'store_id' => $store->id,
                    'message' => $e->getMessage(),
                ]);
            }

            $store->refresh();
            $store->load(['category']);

            return $store;
        });

        try {
            $store->load(['category', 'activeSubscription.plan']);
        } catch (Throwable $e) {
            Log::warning('createStore: optional relations failed to load', [
                'store_id' => $store->id,
                'message' => $e->getMessage(),
            ]);
            try {
                $store->load(['category']);
            } catch (Throwable) {
            }
        }

        $businessType = $store->category?->business_type ?? 'product';

        NextCatalogCacheInvalidate::storesAndProducts();

        try {
            $publicPath = trim((string) ($store->username ?: $store->slug));
            if ($publicPath !== '') {
                SearchEngineIndexer::pingForStore(url('/store/'.$publicPath));
            }
        } catch (\Throwable $e) {
            Log::warning('Store indexing ping skipped', [
                'store_id' => $store->id ?? null,
                'message' => $e->getMessage(),
            ]);
        }

        return $this->successResponse('Store created successfully.', [
            'store' => $store,
            'business_type' => $businessType,
        ]);
    }

    /**
     * Production DBs sometimes lag behind migrations; inserting unknown keys causes SQL 500s.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function dataForStoreInsert(array $data): array
    {
        $fillable = (new Store)->getFillable();
        $out = [];
        foreach ($data as $k => $v) {
            if (in_array($k, $fillable, true)) {
                $out[$k] = $v;
            }
        }

        return $out;
    }

    public function updateStore(Request $request, int $id)
    {
        $store = Store::find($id);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $user = $request->user();
        if ($user->id !== $store->user_id && $user->role !== 'super_admin') {
            return $this->errorResponse('You are not authorized to update this store.', 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'sometimes|nullable|string|max:255|unique:stores,slug,'.$store->id,
            'category_id' => 'sometimes|required|exists:categories,id',
            'logo' => 'nullable|string|max:4000000',
            'phone' => 'nullable|string|max:50',
            'email' => 'sometimes|nullable|email|max:255',
            'show_phone' => 'nullable|boolean',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'seo_keywords' => 'nullable|string|max:4000',
            'keywords' => 'nullable|string|max:4000',
            'is_verified' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'location' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:120',
            'district' => 'nullable|string|max:120',
            'facebook_url' => 'nullable|url|max:255',
            'instagram_url' => 'nullable|url|max:255',
            'youtube_url' => 'nullable|url|max:255',
            'linkedin_url' => 'nullable|url|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();

        if (array_key_exists('slug', $data)) {
            $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? Str::slug($data['name'] ?? $store->name), $store->id);
        }

        if (array_key_exists('logo', $data)) {
            $data['logo'] = $this->normalizeStoreLogoForPersistence($data['logo'] ?? null);
        }
        if (array_key_exists('seo_keywords', $data) || array_key_exists('keywords', $data) || array_key_exists('name', $data) || array_key_exists('location', $data)) {
            $data['seo_keywords'] = $this->normalizeStoreKeywords(
                $data['seo_keywords'] ?? $data['keywords'] ?? $store->seo_keywords ?? null,
                $data['name'] ?? $store->name ?? null,
                $data['location'] ?? $store->location ?? null
            );
            unset($data['keywords']);
        }

        if (array_key_exists('state', $data) && is_string($data['state'])) {
            $data['state'] = trim($data['state']) ?: null;
        }
        if (array_key_exists('district', $data) && is_string($data['district'])) {
            $data['district'] = trim($data['district']) ?: null;
        }

        $hasLocationChange = array_key_exists('location', $data) || array_key_exists('address', $data);
        $coordinatesProvided = array_key_exists('latitude', $data) && array_key_exists('longitude', $data);

        if ($hasLocationChange && ! $coordinatesProvided) {
            $coordinates = $this->geocodeLocation($this->buildGeocodeQuery($data, $store));
            if ($coordinates) {
                [$data['latitude'], $data['longitude']] = $coordinates;
            }
        }

        \Log::info('Updating store', ['store_id' => $store->id, 'data' => $data]);

        $store->update($data);

        \Log::info('Store updated, refreshing data', ['store_id' => $store->id]);
        $store->refresh();
        \Log::info('Store refreshed', ['is_active' => $store->is_active]);

        $store->load([
            'category' => $this->categoryRelationWithBanners(),
            'user',
        ]);
        $store = $this->applyCategoryBannerData($store);

        NextCatalogCacheInvalidate::storesAndProducts();

        return $this->successResponse('Store updated successfully.', [
            'store' => $store,
            'business_type' => $store->category?->business_type,
        ]);
    }

    public function getStoreBySlug(Request $request, string $slug)
    {
        try {
            \Log::info('getStoreBySlug called', ['slug' => $slug]);

            $needle = mb_strtolower(trim(urldecode($slug)));

            $store = Store::query()
                ->where(function ($q) use ($needle) {
                    $q->whereRaw('LOWER(slug) = ?', [$needle])
                        ->orWhereRaw('LOWER(username) = ?', [$needle]);
                })
                ->first();

            if (! $store) {
                \Log::warning('Store not found', ['slug' => $slug]);

                return $this->errorResponse('Store not found.', 404);
            }

            \Log::info('Store found', ['id' => $store->id, 'name' => $store->name]);

            $toLoad = [
                'category' => $this->categoryRelationWithBanners(),
                'products' => function ($query) {
                    $query->select(Product::LIST_COLUMNS)->orderByDesc('created_at');
                },
            ];
            foreach ($this->storeSubscriptionEagerStrings() as $rel) {
                $toLoad[] = $rel;
            }
            try {
                $store->load($toLoad);
                \Log::info('Relationships loaded successfully');
            } catch (\Exception $e) {
                \Log::error('Failed to load relationships: '.$e->getMessage());
            }

            try {
                $store = $this->applyCategoryBannerData($store);
                \Log::info('Category banner data applied');
            } catch (\Exception $e) {
                \Log::error('Failed to apply category banner data: '.$e->getMessage());
                // Continue without banner data
            }

            \Log::info('Returning store response');

            if ($store->relationLoaded('products')) {
                foreach ($store->products as $product) {
                    ProductImageStorage::decorateProductForResponse($product);
                }
            }

            $payload = $store->toArray();
            try {
                $viewer = StoreEngagementController::viewerEngagementFor($store, $request);
                $payload['viewer_following'] = $viewer['viewer_following'];
                $payload['viewer_liked'] = $viewer['viewer_liked'];
            } catch (\Throwable) {
            }
            $payload['keywords'] = $store->seo_keywords ?: $this->normalizeStoreKeywords(null, $store->name, $store->location);

            return $this->successResponse('Store retrieved successfully.', $payload);
        } catch (\Exception $e) {
            \Log::error('getStoreBySlug error: '.$e->getMessage(), [
                'slug' => $slug,
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->errorResponse('Server error while retrieving store.', 500);
        }
    }

    public function deleteStore(Request $request, int $id)
    {
        $store = Store::find($id);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $user = $request->user();
        if ($user->id !== $store->user_id && $user->role !== 'super_admin') {
            return $this->errorResponse('You are not authorized to delete this store.', 403);
        }

        try {
            DB::transaction(function () use ($store, $id) {
                // Prefer Eloquent so events/cascades run as expected.
                $store->delete();

                // Safety: if the row still exists (misconfigured model / connection / constraints),
                // enforce a hard delete at the DB level.
                if (Store::query()->whereKey($id)->exists()) {
                    DB::table('stores')->where('id', $id)->delete();
                }

                // If it still exists, something is seriously wrong (wrong DB, permissions, etc.).
                if (Store::query()->whereKey($id)->exists()) {
                    throw new \RuntimeException('Store delete did not persist. Check DB connection / permissions / foreign keys.');
                }
            }, 3);
        } catch (\Throwable $e) {
            Log::warning('deleteStore failed', [
                'store_id' => $id,
                'user_id' => $user?->id,
                'message' => $e->getMessage(),
            ]);

            return $this->errorResponse('Failed to delete store.', 500);
        }

        NextCatalogCacheInvalidate::storesAndProducts();

        return $this->successResponse('Store deleted successfully.');
    }

    /**
     * Grant lifetime access to a store (admin only).
     */
    public function grantLifetimeAccess(Request $request, int $id)
    {
        $store = Store::find($id);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $user = $request->user();
        if ($user->role !== 'super_admin') {
            return $this->errorResponse('You are not authorized to grant lifetime access.', 403);
        }

        try {
            $store->update(['lifetime_access' => true]);
            
            // Log the action for audit purposes
            Log::info('Lifetime access granted', [
                'store_id' => $store->id,
                'store_name' => $store->name,
                'admin_id' => $user->id,
                'admin_email' => $user->email,
            ]);

            return $this->successResponse('Lifetime access granted successfully.', [
                'store' => $store->fresh(['category', 'activeSubscription.plan'])
            ]);
        } catch (\Throwable $e) {
            Log::error('grantLifetimeAccess failed', [
                'store_id' => $id,
                'admin_id' => $user?->id,
                'message' => $e->getMessage(),
            ]);

            return $this->errorResponse('Failed to grant lifetime access.', 500);
        }
    }

    /**
     * Lightweight links payload for sitemap and crawlable internal linking.
     */
    public function publicStoreInternalLinks()
    {
        try {
            $rows = Store::query()
                ->select(['id', 'slug', 'username', 'updated_at'])
                ->where('is_active', true)
                ->orderByDesc('updated_at')
                ->limit(5000)
                ->get();
        } catch (\Throwable) {
            $rows = Store::query()
                ->select(['id', 'slug', 'username', 'updated_at'])
                ->orderByDesc('updated_at')
                ->limit(5000)
                ->get();
        }

        return $this->successResponse('Store links retrieved successfully.', $rows);
    }

    /**
     * Distinct state + district pairs for sitemaps and internal linking (SEO).
     */
    public function publicLocationLinks()
    {
        try {
            $rows = Store::query()
                ->where('is_active', true)
                ->whereNotNull('state')
                ->whereNotNull('district')
                ->where('state', '!=', '')
                ->where('district', '!=', '')
                ->selectRaw('state, district, COUNT(*) as store_count')
                ->groupBy('state', 'district')
                ->orderByDesc('store_count')
                ->limit(500)
                ->get();
        } catch (\Throwable $e) {
            Log::warning('publicLocationLinks: query failed', ['message' => $e->getMessage()]);

            return $this->successResponse('Location links retrieved successfully.', []);
        }

        $payload = $rows->map(static function ($r) {
            return [
                'state' => $r->state,
                'district' => $r->district,
                'store_count' => (int) $r->store_count,
                'state_slug' => Str::slug((string) $r->state),
                'district_slug' => Str::slug((string) $r->district),
            ];
        });

        return $this->successResponse('Location links retrieved successfully.', $payload);
    }

    private function generateUniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = Str::slug($baseSlug);
        if ($slug === '') {
            $slug = 'store';
        }
        $original = $slug;
        $counter = 1;

        while (Store::where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $original.'-'.$counter++;
        }

        return $slug;
    }

    private function generateUniqueUsername(string $baseUsername, ?int $ignoreId = null): string
    {
        $u = Str::slug($baseUsername);
        if ($u === '') {
            $u = 'store';
        }
        $original = $u;
        $counter = 1;

        while (Store::where('username', $u)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $u = $original.'-'.$counter++;
        }

        return $u;
    }

    private function normalizeStoreKeywords(?string $rawKeywords, ?string $storeName, ?string $location): string
    {
        $raw = trim((string) ($rawKeywords ?? ''));
        if ($raw !== '') {
            return Str::limit($raw, 4000, '');
        }
        $parts = array_values(array_filter([
            $storeName ? Str::title((string) $storeName) : null,
            $location ? Str::title((string) $location) : null,
            'buy online',
            'marketplace',
            'local store',
        ]));

        return implode(', ', $parts);
    }

    /**
     * Shared hosting: listing 50 stores with data-URL base64 logos/banners can exceed memory / JSON limits
     * and return HTTP 500. Strip heavy fields here; store detail routes can still return full rows.
     */
    private function trimHeavyPayloadForStoreListing(Collection $stores): void
    {
        foreach ($stores as $store) {
            if (! $store instanceof Store) {
                continue;
            }

            foreach (['logo', 'banner'] as $attr) {
                $this->nullIfHeavyBinaryString($store, $attr);
            }
            foreach (['description', 'short_description'] as $attr) {
                $this->nullIfHeavyBinaryString($store, $attr, 65536);
            }

            if ($store->relationLoaded('products')) {
                foreach ($store->products as $product) {
                    $this->nullIfHeavyBinaryString($product, 'image');
                    $this->nullIfHeavyBinaryString($product, 'description', 65536);
                    $imgs = $product->getAttribute('images');
                    if (is_array($imgs) && $imgs !== []) {
                        $product->setAttribute('images', []);
                    }
                }
            }

            if ($store->relationLoaded('services')) {
                foreach ($store->services as $service) {
                    $this->nullIfHeavyBinaryString($service, 'image');
                    $this->nullIfHeavyBinaryString($service, 'description', 65536);
                }
            }

            if ($store->relationLoaded('category') && $store->category) {
                $cat = $store->category;
                $this->nullIfHeavyBinaryString($cat, 'banner_image');
                $raw = $cat->getAttribute('banner_images');
                if (is_array($raw) && $raw !== []) {
                    $keep = [];
                    foreach ($raw as $url) {
                        if (! is_string($url) || $url === '') {
                            continue;
                        }
                        if (str_starts_with($url, 'data:') || strlen($url) > 8192) {
                            continue;
                        }
                        $keep[] = $url;
                        if (count($keep) >= 3) {
                            break;
                        }
                    }
                    $cat->setAttribute('banner_images', $keep);
                    if ($keep === []) {
                        $cat->setAttribute('banner_image', null);
                    }
                }
            }
        }
    }

    private function nullIfHeavyBinaryString(object $model, string $attr, int $maxLen = 8192): void
    {
        $v = $model->getAttribute($attr);
        if (! is_string($v) || $v === '') {
            return;
        }
        if (str_starts_with($v, 'data:') || strlen($v) > $maxLen) {
            $model->setAttribute($attr, null);
        }
    }

    /**
     * Save data-URL logos under storage/app/public/store-logos and return a short /storage/... URL.
     * Passes through http(s) URLs and existing /storage paths unchanged.
     */
    private function normalizeStoreLogoForPersistence(?string $logo): ?string
    {
        if ($logo === null) {
            return null;
        }
        $logo = trim($logo);
        if ($logo === '') {
            return null;
        }
        if (str_starts_with($logo, 'http://') || str_starts_with($logo, 'https://')) {
            return $logo;
        }
        if (str_starts_with($logo, '/storage/')) {
            return $logo;
        }
        if (! str_starts_with($logo, 'data:image')) {
            return $logo;
        }
        try {
            if (! preg_match('#^data:image/(png|jpeg|jpg|webp);base64,#i', $logo)) {
                return null;
            }
            $comma = strpos($logo, ',');
            if ($comma === false) {
                return null;
            }
            $raw = base64_decode(substr($logo, $comma + 1), true);
            if ($raw === false || $raw === '') {
                return null;
            }
            if (strlen($raw) > 1_200_000) {
                return null;
            }
            $head = strtolower(substr($logo, 0, 48));
            $ext = 'jpg';
            if (str_contains($head, 'image/png')) {
                $ext = 'png';
            } elseif (str_contains($head, 'image/webp')) {
                $ext = 'webp';
            }
            $compressed = ImageCompression::compressBinary($raw, "image/{$ext}", 1200, 82);
            if (is_array($compressed)) {
                $raw = $compressed['binary'];
                $ext = $compressed['extension'];
            }
            $relative = 'store-logos/'.Str::uuid().'.'.$ext;
            Storage::disk('public')->put($relative, $raw);

            return Storage::disk('public')->url($relative);
        } catch (Throwable $e) {
            Log::warning('normalizeStoreLogoForPersistence failed', [
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function haversineDistanceKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthKm = 6371.0088;
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos($lat1Rad) * cos($lat2Rad) * (sin($dLng / 2) ** 2);
        $c = 2 * atan2(sqrt($a), sqrt(max(0.0, 1 - $a)));

        return $earthKm * $c;
    }

    private function categoryRelationWithBanners(): Closure
    {
        return function ($query) {
            $query->with(['bannerTemplates' => function ($bannerTemplates) {
                $bannerTemplates->orderBy('id');
            }]);
        };
    }

    private function applyCategoryBannerData(Collection|Store $stores)
    {
        $transform = function (Store $store) {
            if (! $store->relationLoaded('category')) {
                return $store;
            }

            $category = $store->category;
            if (! $category) {
                return $store;
            }

            if ($category->relationLoaded('bannerTemplates')) {
                $rawImages = $category->banner_images ?? [];
                if (! is_array($rawImages)) {
                    $rawImages = [];
                }
                $bannerImages = collect($rawImages)
                    ->filter(fn ($url) => filled($url) && is_string($url))
                    ->values();

                if ($bannerImages->isEmpty() && $category->bannerTemplates->isNotEmpty()) {
                    $bannerImages = $category->bannerTemplates
                        ->pluck('bg_image')
                        ->filter(fn ($url) => filled($url) && is_string($url))
                        ->values();
                }

                if ($bannerImages->isNotEmpty()) {
                    $category->setAttribute('banner_images', $bannerImages->all());
                    $category->setAttribute('banner_image', $bannerImages->first());
                }

                $category->unsetRelation('bannerTemplates');
            }

            return $store;
        };

        if ($stores instanceof Store) {
            return $transform($stores);
        }

        return $stores->map(fn ($store) => $transform($store));
    }

    /**
     * Public binary response for store logo (disk `store-logos/*`). Not behind auth.
     * Direct static URLs under `/storage/` often return 422 from the CDN; this matches {@see StoreLogoUrl}.
     */
    public function publicStoreLogo(Request $request, Store $store)
    {
        $raw = $store->getRawOriginal('logo');
        if (! is_string($raw) || $raw === '') {
            abort(404);
        }

        $relative = StoreLogoUrl::relativePathFromStored($raw);
        if ($relative === null || ! Storage::disk('public')->exists($relative)) {
            abort(404);
        }

        $full = Storage::disk('public')->path($relative);
        if (! is_file($full)) {
            abort(404);
        }

        $mime = 'image/jpeg';
        if (function_exists('finfo_open')) {
            $f = finfo_open(FILEINFO_MIME_TYPE);
            if ($f !== false) {
                $detected = finfo_file($f, $full);
                finfo_close($f);
                if (is_string($detected) && str_starts_with($detected, 'image/')) {
                    $mime = $detected;
                }
            }
        }

        return response()->file($full, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private function geocodeLocation(?string $query): ?array
    {
        if (! $query) {
            return null;
        }

        try {
            $cacheKey = 'geocode:nominatim:v1:'.md5(mb_strtolower(trim($query)));
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && isset($cached[0], $cached[1])) {
                return [(float) $cached[0], (float) $cached[1]];
            }

            // Nominatim usage policy: identify the app via UA; retry lightly for transient 429/5xx.
            $response = Http::timeout(10)
                ->retry(2, 250)
                ->withHeaders([
                    'User-Agent' => 'LarawansCatalogue/1.0 (contact: support@larawans.com)',
                    'Accept-Language' => 'en',
                ])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'json',
                    'limit' => 1,
                    'q' => $query,
                ]);

            if (! $response->successful()) {
                Log::warning('Geocoding failed', ['query' => $query, 'status' => $response->status()]);

                return null;
            }

            $data = $response->json();
            if (! is_array($data) || empty($data[0]['lat']) || empty($data[0]['lon'])) {
                return null;
            }

            $out = [
                (float) $data[0]['lat'],
                (float) $data[0]['lon'],
            ];
            Cache::put($cacheKey, $out, now()->addDays(30));
            return $out;
        } catch (\Throwable $exception) {
            Log::warning('Geocoding exception', ['query' => $query, 'message' => $exception->getMessage()]);

            return null;
        }
    }
}
