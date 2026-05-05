<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreNotification;
use App\Support\PruneExpiredReadNotifications;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class StoreOwnerNotificationController extends Controller
{
    /**
     * Notifications for every store owned by the authenticated user (newest first).
     */
    public function index(Request $request)
    {
        try {
            if (! $request->user()) {
                return $this->errorResponse('Unauthorized.', 401);
            }

            PruneExpiredReadNotifications::prune();

            if (! Schema::hasTable('store_notifications')) {
                return $this->successResponse('Notifications not available (migrations).', [
                    'notifications' => [],
                    'unread_count' => 0,
                ]);
            }

            $user = $request->user();
            $storeIds = Store::query()->where('user_id', $user->id)->pluck('id');
            if ($storeIds->isEmpty()) {
                return $this->successResponse('No stores for this account.', [
                    'notifications' => [],
                    'unread_count' => 0,
                ]);
            }

            $limit = min(100, max(1, (int) $request->query('limit', 50)));

            $rows = StoreNotification::query()
                ->whereIn('store_id', $storeIds)
                ->with(['store' => function ($q) {
                    $q->select('id', 'name');
                }])
                ->orderByDesc('id')
                ->limit($limit)
                ->get();

            $unread = StoreNotification::query()
                ->whereIn('store_id', $storeIds)
                ->whereNull('read_at')
                ->count();

            $notifications = $rows->map(function (StoreNotification $n) {
                try {
                    $meta = self::safeMetaFromModel($n);

                    return [
                        'id' => $n->id,
                        'store_id' => $n->store_id,
                        'store_name' => $n->store?->name,
                        'type' => $n->type,
                        'title' => $n->title,
                        'body' => $n->body,
                        'meta' => $meta,
                        'read_at' => $n->read_at?->toIso8601String(),
                        'created_at' => $n->created_at?->toIso8601String(),
                    ];
                } catch (Throwable $rowErr) {
                    Log::warning('store notification row skip', ['id' => $n->id ?? null, 'message' => $rowErr->getMessage()]);

                    return null;
                }
            })->filter()->values()->all();

            return $this->successResponse('Notifications retrieved.', [
                'notifications' => $notifications,
                'unread_count' => $unread,
            ]);
        } catch (Throwable $e) {
            Log::error('store owner notifications index', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);

            return $this->successResponse('Notifications temporarily unavailable.', [
                'notifications' => [],
                'unread_count' => 0,
            ]);
        }
    }

    /**
     * @see \App\Http\Controllers\Api\UserNotificationController::safeMetaFromModel
     */
    private static function safeMetaFromModel(StoreNotification $n): ?array
    {
        try {
            $v = $n->getAttribute('meta');
            if (is_array($v)) {
                return $v;
            }
        } catch (Throwable) {
            /* fall through to raw */
        }

        $raw = $n->getRawOriginal('meta') ?? $n->getAttributes()['meta'] ?? null;
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_array($raw)) {
            return $raw;
        }
        if (is_string($raw)) {
            $decoded = json_decode($raw, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    public function markRead(Request $request, StoreNotification $notification)
    {
        $storeIds = Store::query()->where('user_id', $request->user()->id)->pluck('id');
        if (! $storeIds->contains($notification->store_id)) {
            return $this->errorResponse('Not found.', 404);
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return $this->successResponse('Marked as read.', [
            'id' => $notification->id,
            'read_at' => $notification->read_at?->toIso8601String(),
        ]);
    }

    public function destroy(Request $request, StoreNotification $notification)
    {
        $storeIds = Store::query()->where('user_id', $request->user()->id)->pluck('id');
        if (! $storeIds->contains($notification->store_id)) {
            return $this->errorResponse('Not found.', 404);
        }

        if ($notification->read_at === null) {
            return $this->errorResponse('Unread notifications cannot be deleted.', 422);
        }

        if ($notification->read_at->gt(now()->subHours(PruneExpiredReadNotifications::READ_TTL_HOURS))) {
            return $this->errorResponse('Read notifications can be deleted only after 24 hours.', 422);
        }

        $notification->delete();

        return $this->successResponse('Notification deleted.', [
            'id' => $notification->id,
        ]);
    }
}
