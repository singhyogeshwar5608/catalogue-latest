<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Build browser-usable URLs for store payment QR files.
 */
final class PaymentQrUrl
{
    public const PUBLIC_PREFIX = 'store-payment-qr';

    public static function isPublicDiskPath(?string $path): bool
    {
        return is_string($path)
            && $path !== ''
            && str_starts_with($path, self::PUBLIC_PREFIX.'/');
    }

    /**
     * Numeric folder segment after `store-payment-qr/` (e.g. `store-payment-qr/119/uuid.png` → 119).
     */
    public static function storeIdFromPublicQrPath(string $path): ?int
    {
        $normalized = Str::replace('\\', '/', $path);
        if (preg_match('#^'.preg_quote(self::PUBLIC_PREFIX, '#').'/(\d+)/#', $normalized, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * QR files live under `public/store-payment-qr/...`. Browsers must not request that path as a bare
     * static URL (some CDNs return 422). We point at the public API action that streams the file instead.
     * Uses `APP_URL` only — not `ASSET_URL` — so the request hits the app origin, not a static CDN host.
     */
    public static function publicWebUrl(?string $path, ?int $storeId = null): ?string
    {
        if (! self::isPublicDiskPath($path)) {
            return null;
        }

        $pathStr = (string) $path;
        $fromPath = self::storeIdFromPublicQrPath($pathStr);
        $resolvedId = $storeId ?? $fromPath;

        if ($resolvedId === null || $resolvedId <= 0) {
            return null;
        }

        if ($storeId !== null) {
            $normalized = Str::replace('\\', '/', $pathStr);
            if (! str_starts_with($normalized, self::PUBLIC_PREFIX.'/'.$storeId.'/')) {
                return null;
            }
        }

        $full = public_path($path);
        if (! is_file($full)) {
            return null;
        }

        $base = rtrim((string) config('app.url'), '/');
        $suffix = '/api/v1/v1/stores/'.$resolvedId.'/payment-qr-image';
        /** Same path for every file → browsers cache one PNG; basename changes on each upload. */
        $v = basename(str_replace('\\', '/', $pathStr));
        $query = ($v !== '' && $v !== '.' && $v !== '..') ? '?v='.rawurlencode($v) : '';

        if ($base === '') {
            return $suffix.$query;
        }

        return $base.$suffix.$query;
    }

    /**
     * Older rows: path under `storage/app/public` (symlinked as `/storage/...`).
     */
    public static function legacyStorageUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '' || self::isPublicDiskPath($path)) {
            return null;
        }

        try {
            if (Storage::disk('public')->exists($path)) {
                return Storage::disk('public')->url($path);
            }
        } catch (\Throwable) {
        }

        return null;
    }

    public static function displayUrl(?string $path, ?int $storeId = null): ?string
    {
        return self::publicWebUrl($path, $storeId) ?? self::legacyStorageUrl($path);
    }
}
