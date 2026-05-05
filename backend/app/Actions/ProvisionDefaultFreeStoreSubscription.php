<?php

namespace App\Actions;

use App\Models\PlatformSetting;
use App\Models\Store;
use App\Models\StoreSubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Assigns the platform free (price 0 / slug "free") plan for a new or legacy store that has no subscriptions yet.
 */
final class ProvisionDefaultFreeStoreSubscription
{
    public static function run(Store $store, int $activatedByUserId): ?StoreSubscription
    {
        if (! Schema::hasTable('store_subscriptions') || ! Schema::hasTable('subscription_plans')) {
            return null;
        }

        if ($store->storeSubscriptions()->exists()) {
            return null;
        }

        $plan = SubscriptionPlan::query()
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereRaw('LOWER(slug) = ?', ['free'])
                    ->orWhere('price', 0);
            })
            ->orderByRaw("CASE WHEN LOWER(slug) = 'free' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->first();

        if (! $plan) {
            Log::warning('No free subscription plan found; store left without subscription.', [
                'store_id' => $store->id,
            ]);

            return null;
        }

        $trialDays = PlatformSetting::freeTrialDays();
        $days = max(1, $trialDays);
        $startsAt = Carbon::parse($store->created_at);
        $endsAt = $startsAt->copy()->addDays($days)->endOfDay();

        $addonsDefaults = [
            'payment_gateway' => false,
            'qr_code' => false,
            'payment_gateway_help' => false,
        ];

        $subscription = StoreSubscription::create([
            'store_id' => $store->id,
            'subscription_plan_id' => $plan->id,
            'price' => (int) $plan->price,
            'status' => 'active',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'auto_renew' => true,
            'metadata' => [
                'addons' => $addonsDefaults,
                'provisioned' => 'store_signup',
            ],
            'activated_by' => $activatedByUserId,
        ]);

        if (Schema::hasColumn('stores', 'subscription_addons')) {
            $store->forceFill(['subscription_addons' => $addonsDefaults])->save();
        }

        return $subscription->fresh(['plan']);
    }
}
