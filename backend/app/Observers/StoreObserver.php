<?php

namespace App\Observers;

use App\Models\Store;
use App\Support\StoreProductListCache;
use App\Support\StoreLogoUrl;

/**
 * Ensures product-list cache keys rotate before a store row is removed (Eloquent or API);
 * manual SQL deletes are not covered — run `php artisan cache:clear` and POST Next `/api/cache/invalidate` if needed.
 */
class StoreObserver
{
    public function deleting(Store $store): void
    {
        StoreProductListCache::bump((int) $store->id);

        // Delete store logo from storage
        if ($store->logo) {
            StoreLogoUrl::deleteStoredLogo($store->logo);
        }

        // Delete payment QR if exists
        if ($store->payment_qr_path) {
            $full = public_path($store->payment_qr_path);
            if (is_file($full)) {
                @unlink($full);
            }
            try {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($store->payment_qr_path);
            } catch (\Throwable) {
                // ignore
            }
        }
    }
}
