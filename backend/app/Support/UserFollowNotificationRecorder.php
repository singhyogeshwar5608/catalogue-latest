<?php

namespace App\Support;

use App\Models\Product;
use App\Models\Store;
use App\Models\StoreFollow;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Notifications for logged-in users who follow a store (e.g. new product listing).
 */
final class UserFollowNotificationRecorder
{
    public const TYPE_FOLLOWED_STORE_PRODUCT = 'followed_store_product';

    public static function newProduct(Store $store, Product $product): void
    {
        if (! Schema::hasTable('user_notifications') || ! Schema::hasTable('store_follows')) {
            return;
        }

        $ownerId = (int) $store->user_id;
        $keys = StoreFollow::query()
            ->where('store_id', $store->id)
            ->where('actor_key', 'like', 'u:%')
            ->pluck('actor_key');

        $userIds = $keys
            ->map(fn (string $k): int => (int) substr($k, 2))
            ->filter(fn (int $id): bool => $id > 0 && $id !== $ownerId)
            ->unique()
            ->values();

        if ($userIds->isEmpty()) {
            return;
        }

        $storeLabel = trim((string) $store->name) !== '' ? trim((string) $store->name) : 'A store you follow';
        $productLabel = trim((string) $product->title) !== '' ? trim((string) $product->title) : 'New product';
        $username = trim((string) ($store->username ?? ''));
        $meta = [
            'store_id' => (int) $store->id,
            'product_id' => (int) $product->id,
            'store_username' => $username !== '' ? $username : null,
        ];

        $title = 'New product';
        $body = $storeLabel.' added '.$productLabel.'.';

        $now = now();
        $rows = [];

        foreach ($userIds as $uid) {
            $rows[] = [
                'user_id' => $uid,
                'type' => self::TYPE_FOLLOWED_STORE_PRODUCT,
                'title' => $title,
                'body' => $body,
                'meta' => json_encode($meta),
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 250) as $chunk) {
            try {
                UserNotification::query()->insert($chunk);
            } catch (Throwable $e) {
                report($e);
            }
        }
    }
}
