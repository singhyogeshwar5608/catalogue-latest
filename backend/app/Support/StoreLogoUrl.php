<?php

namespace App\Support;

/**
 * Store logos live under the public disk at `store-logos/*`.
 * Direct `https://{app}/storage/store-logos/...` URLs often get **422 Invalid source image** from Hostinger CDN
 * (same class of issue as {@see PaymentQrUrl} for payment QR). Expose them through the Laravel API instead.
 */
final class StoreLogoUrl
{
    private const PREFIX = 'store-logos/';

    /**
     * Extract `store-logos/{uuid}.{ext}` from a stored value (full URL, /storage/..., or bare relative).
     */
    public static function relativePathFromStored(?string $raw): ?string
    {
        if (! is_string($raw) || $raw === '') {
            return null;
        }
        $t = trim(str_replace('\\', '/', $raw));
        if ($t === '') {
            return null;
        }
        // Already using our stream endpoint — do not re-parse.
        if (str_contains($t, '/stores/') && str_contains($t, '/logo-image')) {
            return null;
        }
        if (! str_contains($t, self::PREFIX)) {
            return null;
        }
        if (! preg_match('#(store-logos/[a-f0-9\-]+\.(?:jpg|jpeg|png|webp))#i', $t, $m)) {
            return null;
        }

        return $m[1];
    }

    /**
     * Browser-safe URL that streams the file via PHP (bypasses CDN static rules).
     */
    public static function toStreamUrl(?string $stored, int $storeId): ?string
    {
        if ($storeId <= 0 || ! is_string($stored) || trim($stored) === '') {
            return null;
        }
        if (self::relativePathFromStored($stored) === null) {
            return null;
        }

        $base = rtrim((string) config('app.url'), '/');
        $suffix = '/api/v1/v1/stores/'.$storeId.'/logo-image';
        $rel = self::relativePathFromStored($stored);
        $v = $rel !== null ? basename($rel) : '';

        $query = ($v !== '' && $v !== '.' && $v !== '..') ? '?v='.rawurlencode($v) : '';

        if ($base === '') {
            return $suffix.$query;
        }

        return $base.$suffix.$query;
    }
}
