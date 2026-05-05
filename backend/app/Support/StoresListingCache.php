<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Public {@see StoreController::listStores} responses are cached in Laravel (default 60s).
 * That cache is keyed only by query string, so deletes/updates otherwise keep serving stale rows
 * until TTL — while {@code GET /store/{slug}} correctly 404s. Bumping this nonce changes every
 * cached key instantly.
 */
final class StoresListingCache
{
    private const NONCE_KEY = 'stores_public_list_nonce_v1';

    public static function nonce(): string
    {
        return (string) Cache::get(self::NONCE_KEY, '0');
    }

    public static function bust(): void
    {
        Cache::forever(self::NONCE_KEY, bin2hex(random_bytes(8)));
    }
}
