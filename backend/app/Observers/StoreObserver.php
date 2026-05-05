<?php

namespace App\Observers;

use App\Models\Store;
use App\Support\StoreProductListCache;

/**
 * Ensures product-list cache keys rotate before a store row is removed (Eloquent or API);
 * manual SQL deletes are not covered — run `php artisan cache:clear` and POST Next `/api/cache/invalidate` if needed.
 */
class StoreObserver
{
    public function deleting(Store $store): void
    {
        StoreProductListCache::bump((int) $store->id);
    }
}
