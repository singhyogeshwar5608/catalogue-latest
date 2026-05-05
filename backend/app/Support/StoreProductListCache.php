<?php

namespace App\Support;

use App\Models\Store;
use Illuminate\Support\Facades\Schema;

/**
 * Invalidates {@see ProductController::getProductsByStore} cache keys by bumping the
 * store row (updated_at + optional product_list_cache_version) so `Cache::remember`
 * uses new keys. Call on every product mutation and on store delete (see StoreObserver).
 */
final class StoreProductListCache
{
    public static function bump(int $storeId): void
    {
        if ($storeId < 1) {
            return;
        }

        // Touch updated_at so keys invalidate when product_list_cache_version is missing.
        Store::query()->whereKey($storeId)->update(['updated_at' => now()]);

        if (! Schema::hasColumn('stores', 'product_list_cache_version')) {
            return;
        }
        Store::query()->whereKey($storeId)->increment('product_list_cache_version');
    }
}
