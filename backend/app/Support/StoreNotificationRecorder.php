<?php

namespace App\Support;

use App\Models\Store;
use App\Models\StoreNotification;
use App\Models\StoreSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Persists dashboard notifications for store owners (follow, like, first visit hit, subscription).
 * Failures are swallowed so primary API flows never break if the table is missing.
 */
final class StoreNotificationRecorder
{
    public static function follow(Store $store, string $actorKey, int $followersCount): void
    {
        $label = self::actorLabel($actorKey);
        self::insert($store->id, 'follow', 'New follower', $label.' started following your store.', [
            'actor_key' => $actorKey,
            'actor_label' => $label,
            'followers_count' => $followersCount,
        ]);
    }

    public static function like(Store $store, string $actorKey, int $likesCount): void
    {
        $label = self::actorLabel($actorKey);
        self::insert($store->id, 'like', 'New like', $label.' liked your store.', [
            'actor_key' => $actorKey,
            'actor_label' => $label,
            'likes_count' => $likesCount,
        ]);
    }

    public static function seen(Store $store, string $actorKey, int $seenCount): void
    {
        $label = self::actorLabel($actorKey);
        self::insert($store->id, 'seen', 'Store visit', $label.' viewed your storefront.', [
            'actor_key' => $actorKey,
            'actor_label' => $label,
            'seen_count' => $seenCount,
        ]);
    }

    public static function subscriptionActivated(Store $store, StoreSubscription $subscription): void
    {
        $subscription->loadMissing('plan');
        $planName = trim((string) ($subscription->plan?->name ?? $subscription->plan?->slug ?? 'Plan'));
        $ends = $subscription->ends_at?->format('M j, Y') ?? '';

        self::insert($store->id, 'subscription', 'Subscription updated', 'Your subscription is now active on '.$planName.'.'.($ends !== '' ? ' Current period ends '.$ends.'.' : ''), [
            'subscription_id' => $subscription->id,
            'plan_name' => $planName,
            'ends_at' => $ends,
        ]);
    }

    public static function subscriptionUpgradeInquiryFulfilled(Store $store, array $addons): void
    {
        $qr = (bool) ($addons['qr_code'] ?? false);
        $pg = (bool) ($addons['payment_gateway'] ?? false);
        $help = (bool) ($addons['payment_gateway_help'] ?? false);

        $label = 'Payment settings updated';
        
        $statusParts = [];
        $statusParts[] = 'QR Code: ' . ($qr ? 'Enabled' : 'Disabled');
        $statusParts[] = 'Payment Gateway: ' . ($pg ? 'Enabled' : 'Disabled');
        if (array_key_exists('payment_gateway_help', $addons)) {
            $statusParts[] = 'PG Approval Help: ' . ($help ? 'Enabled' : 'Disabled');
        }

        $body = 'Admin updated your payment integration settings. Currently: ' . implode(', ', $statusParts) . '.';
        
        if ($qr || $pg) {
            $body .= ' You can update integration details in Payment settings.';
        }

        self::insert(
            $store->id,
            'subscription',
            $label,
            $body,
            ['addons' => $addons],
        );
    }

    public static function subscriptionUpgradeRequested(Store $store, array $addons): void
    {
        $qr = (bool) ($addons['payment_gateway'] ?? false);
        $pg = (bool) ($addons['payment_gateway'] ?? false);
        $help = (bool) ($addons['payment_gateway_help'] ?? false);

        $statusParts = [];
        if ($qr) $statusParts[] = 'QR Code';
        if ($pg) $statusParts[] = 'Payment Gateway';
        if ($help) $statusParts[] = 'PG Approval Help';

        $body = 'You requested an upgrade for: ' . implode(', ', $statusParts) . '. Admin will verify and activate these features soon.';

        self::insert(
            $store->id,
            'subscription',
            'Upgrade request submitted',
            $body,
            ['addons' => $addons],
        );
    }

    private static function actorLabel(string $actorKey): string
    {
        if (str_starts_with($actorKey, 'u:')) {
            $id = (int) substr($actorKey, 2);
            if ($id > 0) {
                try {
                    $name = User::query()->whereKey($id)->value('name');
                    if (is_string($name) && trim($name) !== '') {
                        return trim($name);
                    }
                } catch (Throwable) {
                    // ignore
                }
            }

            return 'A registered customer';
        }

        return 'A visitor';
    }

    private static function insert(int $storeId, string $type, string $title, ?string $body, array $meta): void
    {
        if (! Schema::hasTable('store_notifications')) {
            return;
        }

        try {
            StoreNotification::query()->create([
                'store_id' => $storeId,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'meta' => $meta !== [] ? $meta : null,
            ]);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
