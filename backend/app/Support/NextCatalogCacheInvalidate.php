<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Clears Next.js / Upstash Redis catalog keys via POST /api/cache/invalidate.
 *
 * Configure in .env (must match Next {@see CACHE_INVALIDATE_SECRET}):
 * - NEXT_CACHE_INVALIDATE_URL=https://your-frontend.com/api/cache/invalidate
 * - NEXT_CACHE_INVALIDATE_SECRET=...
 */
final class NextCatalogCacheInvalidate
{
    private const ALLOWED_SCOPES = ['stores', 'products', 'users'];

    /**
     * @param  list<string>  $scopes  One or more of: stores, products, users
     */
    public static function scopes(array $scopes): void
    {
        $scopes = array_values(array_unique(array_values(array_filter($scopes))));
        $scopes = array_values(array_intersect(self::ALLOWED_SCOPES, $scopes));
        if (in_array('stores', $scopes, true)) {
            StoresListingCache::bust();
        }

        if ($scopes === []) {
            return;
        }

        $url = (string) config('services.next_cache_invalidate_url', '');
        $url = rtrim(trim($url), '/');
        if ($url === '') {
            Log::warning('Next catalog cache not invalidated: NEXT_CACHE_INVALIDATE_URL is empty. Set it in backend .env to your Next.js origin, e.g. http://127.0.0.1:3000/api/cache/invalidate (see backend/.env.example).', [
                'scopes' => $scopes,
            ]);

            return;
        }

        $secret = (string) config('services.next_cache_invalidate_secret', '');
        try {
            Http::timeout(8)
                ->retry(2, 200)
                ->withHeaders([
                    'X-Cache-Invalidate-Secret' => $secret,
                    'Accept' => 'application/json',
                ])
                ->post($url, ['scopes' => $scopes]);
        } catch (\Throwable $e) {
            Log::warning('Next catalog cache invalidate request failed.', [
                'scopes' => $scopes,
                'url' => $url,
                'message' => $e->getMessage(),
            ]);
        }
    }

    public static function stores(): void
    {
        self::scopes(['stores']);
    }

    public static function products(): void
    {
        self::scopes(['products']);
    }

    public static function users(): void
    {
        self::scopes(['users']);
    }

    /**
     * Store create/update/delete affects public store payloads; bust product keys too when catalog mixes both.
     */
    public static function storesAndProducts(): void
    {
        self::scopes(['stores', 'products']);
    }
}
