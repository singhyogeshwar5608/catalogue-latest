<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

final class SearchEngineIndexer
{
    /**
     * Best-effort ping after new public content is created.
     * This is intentionally non-blocking: failures are logged and never break API responses.
     */
    public static function pingForStore(string $storePublicUrl): void
    {
        self::notifyEngines($storePublicUrl, 'update');
    }

    /**
     * Best-effort notification after public content is deleted.
     */
    public static function removeForStore(string $storePublicUrl): void
    {
        self::notifyEngines($storePublicUrl, 'delete');
    }

    private static function notifyEngines(string $url, string $action = 'update'): void
    {
        try {
            $sitemapUrl = rtrim((string) config('app.url'), '/').'/sitemap.xml';
            
            // For updates, we can still ping Bing's sitemap endpoint.
            if ($action === 'update') {
                $targets = [
                    'https://www.bing.com/ping?sitemap='.rawurlencode($sitemapUrl),
                ];
                foreach ($targets as $target) {
                    Http::timeout(3)->get($target);
                }
            }

            // Optional IndexNow integration (recommended for Bing/Yandex).
            $indexNowHost = trim((string) env('INDEXNOW_HOST', ''));
            $indexNowKey = trim((string) env('INDEXNOW_KEY', ''));
            
            if ($indexNowHost !== '' && $indexNowKey !== '') {
                // IndexNow supports explicit deletion notification via the same endpoint
                // but the URL should ideally return 404 or 410.
                Http::timeout(3)->asJson()->post('https://api.indexnow.org/indexnow', [
                    'host' => $indexNowHost,
                    'key' => $indexNowKey,
                    'urlList' => [$url],
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning("Search engine {$action} notification failed", [
                'message' => $e->getMessage(),
                'store_url' => $url,
            ]);
        }
    }
}
