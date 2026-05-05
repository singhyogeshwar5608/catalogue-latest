<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Service;
use App\Models\Store;
use App\Support\ProductImageStorage;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    private const ALLOWED_TYPES = ['stores', 'products', 'services'];

    public function search(Request $request)
    {
        $query = trim((string) $request->input('q', ''));
        $locationFilter = trim((string) $request->input('location', ''));
        $latitude = $request->input('lat');
        $longitude = $request->input('lng');
        $radius = $this->normalizeRadius($request->input('radius_km', 50));

        $types = $this->resolveTypes($request->input('types'));
        $limits = $this->resolveLimits($request);

        $results = [
            'stores' => [],
            'products' => [],
            'services' => [],
        ];

        if (in_array('stores', $types, true)) {
            $results['stores'] = $this->searchStores($query, $locationFilter, $latitude, $longitude, $radius, $limits['stores']);
        }

        if (in_array('products', $types, true)) {
            $results['products'] = $this->searchProducts($query, $locationFilter, $latitude, $longitude, $radius, $limits['products']);
        }

        if (in_array('services', $types, true)) {
            $results['services'] = $this->searchServices($query, $locationFilter, $latitude, $longitude, $radius, $limits['services']);
        }

        return $this->successResponse('Search results', [
            'query' => $query,
            'location' => $locationFilter,
            'lat' => $latitude !== null ? (float) $latitude : null,
            'lng' => $longitude !== null ? (float) $longitude : null,
            'radius_km' => $radius,
            'types' => $types,
            'results' => $results,
        ]);
    }

    private function resolveTypes(mixed $input): array
    {
        $raw = [];

        if (is_string($input)) {
            $raw = array_map('trim', explode(',', $input));
        } elseif (is_array($input)) {
            $raw = array_map(static fn ($value) => is_string($value) ? trim($value) : $value, $input);
        }

        $types = [];
        foreach ($raw as $value) {
            if (! is_string($value) || $value === '') {
                continue;
            }

            $candidate = strtolower($value);
            if (in_array($candidate, self::ALLOWED_TYPES, true) && ! in_array($candidate, $types, true)) {
                $types[] = $candidate;
            }
        }

        if (empty($types)) {
            return self::ALLOWED_TYPES;
        }

        return $types;
    }

    private function resolveLimits(Request $request): array
    {
        return [
            'stores' => $this->clampLimit($request->integer('store_limit', 6)),
            'products' => $this->clampLimit($request->integer('product_limit', 6)),
            'services' => $this->clampLimit($request->integer('service_limit', 6)),
        ];
    }

    private function clampLimit(?int $value): int
    {
        $limit = $value ?? 6;

        return max(1, min($limit, 25));
    }

    private function normalizeRadius(mixed $value): float
    {
        $radius = is_numeric($value) ? (float) $value : 50.0;

        return max(1.0, min($radius, 200.0));
    }

    private function applyStoreSearchFilters(
        $query,
        string $searchTerm,
        string $locationFilter,
        mixed $latitude,
        mixed $longitude,
        float $radius
    ): void {
        if ($searchTerm !== '') {
            $like = "%{$searchTerm}%";
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('slug', 'like', $like)
                    ->orWhere('username', 'like', $like)
                    ->orWhereRaw('CAST(stores.id AS CHAR) LIKE ?', [$like])
                    ->orWhere('short_description', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('location', 'like', $like)
                    ->orWhere('address', 'like', $like)
                    ->orWhere('state', 'like', $like)
                    ->orWhere('district', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('whatsapp', 'like', $like)
                    ->orWhere('email', 'like', $like)
                    ->orWhereHas('category', function ($categoryQuery) use ($like) {
                        $categoryQuery->where('name', 'like', $like);
                    })
                    ->orWhereHas('user', function ($userQuery) use ($like) {
                        $userQuery->where('name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('phone', 'like', $like);
                    });
            });
        }

        if ($locationFilter !== '') {
            $query->where('location', 'like', "%{$locationFilter}%");
        }

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $lat = (float) $latitude;
            $lng = (float) $longitude;
            $haversine = '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))';

            $query->whereNotNull('latitude')
                ->whereNotNull('longitude')
                ->whereRaw("{$haversine} <= ?", [$lat, $lng, $lat, $radius]);
        }
    }

    private function searchStores(string $searchTerm, string $locationFilter, mixed $latitude, mixed $longitude, float $radius, int $limit)
    {
        $query = Store::query()
            ->where('is_active', true)
            ->with([
                'category:id,name,business_type,banner_image,banner_color',
                'user:id,name,email,phone',
            ])
            ->withCount([
                'products' => fn ($q) => $q->where('is_active', true),
                'services' => fn ($q) => $q->where('is_active', true),
            ]);

        $this->applyStoreSearchFilters($query, $searchTerm, $locationFilter, $latitude, $longitude, $radius);

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $lat = (float) $latitude;
            $lng = (float) $longitude;
            $haversine = '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))';

            $query->select('*')
                ->selectRaw("{$haversine} as distance_km", [$lat, $lng, $lat])
                ->orderBy('distance_km');
        } else {
            $query->latest();
        }

        return $query->take($limit)->get();
    }

    private function searchProducts(string $searchTerm, string $locationFilter, mixed $latitude, mixed $longitude, float $radius, int $limit)
    {
        $query = Product::query()
            ->select(Product::LIST_COLUMNS)
            ->with(['store' => function ($storeQuery) {
                $storeQuery->select('id', 'name', 'slug', 'username', 'location', 'phone', 'whatsapp', 'business_type', 'is_verified', 'is_active', 'latitude', 'longitude');
            }])
            ->where('is_active', true)
            ->whereHas('store', function ($storeQuery) {
                $storeQuery->where('is_active', true);
            });

        if ($searchTerm !== '') {
            $like = "%{$searchTerm}%";
            $query->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('category', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereRaw('CAST(products.price AS CHAR) LIKE ?', [$like])
                    ->orWhere(function ($sub) use ($like) {
                        $sub->whereNotNull('original_price')
                            ->whereRaw('CAST(products.original_price AS CHAR) LIKE ?', [$like]);
                    })
                    ->orWhere(function ($sub) use ($like) {
                        $sub->whereNotNull('discount_price')
                            ->whereRaw('CAST(products.discount_price AS CHAR) LIKE ?', [$like]);
                    })
                    ->orWhereHas('store', function ($storeQuery) use ($like) {
                        $storeQuery
                            ->where('name', 'like', $like)
                            ->orWhere('username', 'like', $like)
                            ->orWhere('slug', 'like', $like)
                            ->orWhereRaw('CAST(stores.id AS CHAR) LIKE ?', [$like])
                            ->orWhere('location', 'like', $like)
                            ->orWhere('phone', 'like', $like)
                            ->orWhere('whatsapp', 'like', $like);
                    });
            });
        }

        if ($locationFilter !== '') {
            $query->whereHas('store', function ($storeQuery) use ($locationFilter) {
                $storeQuery->where('location', 'like', "%{$locationFilter}%");
            });
        }

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $lat = (float) $latitude;
            $lng = (float) $longitude;
            $haversine = '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))';

            $query->whereHas('store', function ($storeQuery) use ($lat, $lng, $radius, $haversine) {
                $storeQuery->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("{$haversine} <= ?", [$lat, $lng, $lat, $radius]);
            });
        }

        $rows = $query->orderByDesc('rating')->orderByDesc('total_reviews')->take($limit)->get();
        foreach ($rows as $product) {
            if ($product instanceof Product) {
                ProductImageStorage::decorateProductForResponse($product);
            }
        }

        return $rows;
    }

    private function searchServices(string $searchTerm, string $locationFilter, mixed $latitude, mixed $longitude, float $radius, int $limit)
    {
        $query = Service::query()
            ->with(['store' => function ($storeQuery) {
                $storeQuery->select('id', 'name', 'slug', 'username', 'location', 'phone', 'whatsapp', 'business_type', 'is_verified', 'is_active', 'latitude', 'longitude');
            }])
            ->where('is_active', true)
            ->whereHas('store', function ($storeQuery) {
                $storeQuery->where('is_active', true);
            });

        if ($searchTerm !== '') {
            $like = "%{$searchTerm}%";
            $query->where(function ($q) use ($like) {
                $q->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereRaw('CAST(services.price AS CHAR) LIKE ?', [$like])
                    ->orWhereHas('store', function ($storeQuery) use ($like) {
                        $storeQuery
                            ->where('name', 'like', $like)
                            ->orWhere('username', 'like', $like)
                            ->orWhere('slug', 'like', $like)
                            ->orWhereRaw('CAST(stores.id AS CHAR) LIKE ?', [$like])
                            ->orWhere('location', 'like', $like)
                            ->orWhere('phone', 'like', $like)
                            ->orWhere('whatsapp', 'like', $like);
                    });
            });
        }

        if ($locationFilter !== '') {
            $query->whereHas('store', function ($storeQuery) use ($locationFilter) {
                $storeQuery->where('location', 'like', "%{$locationFilter}%");
            });
        }

        if (is_numeric($latitude) && is_numeric($longitude)) {
            $lat = (float) $latitude;
            $lng = (float) $longitude;
            $haversine = '(6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude))))';

            $query->whereHas('store', function ($storeQuery) use ($lat, $lng, $radius, $haversine) {
                $storeQuery->whereNotNull('latitude')
                    ->whereNotNull('longitude')
                    ->whereRaw("{$haversine} <= ?", [$lat, $lng, $lat, $radius]);
            });
        }

        return $query->orderBy('title')->take($limit)->get();
    }
}
