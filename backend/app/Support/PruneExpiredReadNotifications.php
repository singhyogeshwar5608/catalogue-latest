<?php

namespace App\Support;

use App\Models\StoreNotification;
use App\Models\UserNotification;
use Illuminate\Support\Facades\Schema;

/**
 * In-app notifications: remove rows whose {@see UserNotification::$created_at} /
 * {@see StoreNotification::$created_at} is older than {@see self::TTL_HOURS} (read or unread).
 */
final class PruneExpiredReadNotifications
{
    public const READ_TTL_HOURS = 24;

    /** Retention: notifications are removed after this many hours from creation. */
    public const TTL_HOURS = 24;

    public static function prune(): void
    {
        $cut = now()->subHours(self::TTL_HOURS);

        if (Schema::hasTable('user_notifications')) {
            UserNotification::query()
                ->where('created_at', '<', $cut)
                ->delete();
        }

        if (Schema::hasTable('store_notifications')) {
            StoreNotification::query()
                ->where('created_at', '<', $cut)
                ->delete();
        }
    }
}
