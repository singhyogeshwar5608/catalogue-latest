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
        try {
            $sitemapUrl = rtrim((string) config('app.url'), '/').'/sitemap.xml';
            $targets = [
                // Bing still supports sitemap ping endpoint.
                'https://www.bing.com/ping?sitemap='.rawurlencode($sitemapUrl),
            ];

            // Optional IndexNow integration (recommended for Bing/Yandex).
            $indexNowHost = trim((string) env('INDEXNOW_HOST', ''));
            $indexNowKey = trim((string) env('INDEXNOW_KEY', ''));
            if ($indexNowHost !== '' && $indexNowKey !== '') {
                Http::timeout(3)->asJson()->post('https://api.indexnow.org/indexnow', [
                    'host' => $indexNowHost,
                    'key' => $indexNowKey,
                    'urlList' => [$storePublicUrl],
                ]);
            }

            foreach ($targets as $target) {
                Http::timeout(3)->get($target);
            }
        } catch (\Throwable $e) {
            Log::warning('Search engine ping failed', [
                'message' => $e->getMessage(),
                'store_url' => $storePublicUrl,
            ]);
        }
    }
}
