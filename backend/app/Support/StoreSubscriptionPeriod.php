<?php

namespace App\Support;

use App\Models\Store;
use App\Models\StoreSubscription;
use App\Models\SubscriptionPlan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/**
 * Computes paid subscription {@see StoreSubscription::$ends_at}.
 *
 * When the customer is upgrading from the free/trial tier to a paid plan, remaining free-trial calendar days
 * (from {@see Store::$trial_ends_at}) are appended to the new plan's base length (e.g. 30 days + 4 trial = 34).
 *
 * When the store has **ever** had a paid plan, or the replaced subscription is a paid one, no trial
 * days are added — the new period is plan length only (no leftover paid days, no second trial credit).
 */
final class StoreSubscriptionPeriod
{
    /**
     * Any historical non-free plan row (so trial-to-paid credit runs at most once per store).
     */
    public static function hasEverHadPaidSubscription(Store $store): bool
    {
        if (! Schema::hasTable('store_subscriptions') || ! Schema::hasTable('subscription_plans')) {
            return false;
        }

        return $store->storeSubscriptions()
            ->whereHas('plan', function ($q) {
                $q->where('price', '>', 0);
            })
            ->exists();
    }
    /**
     * @param  StoreSubscription|null  $replacedActiveSubscription  Active row before this activation (cancelled in the same transaction).
     */
    public static function endsAtForPaidActivation(
        Store $store,
        SubscriptionPlan $plan,
        Carbon $startsAt,
        ?StoreSubscription $replacedActiveSubscription,
    ): Carbon {
        $baseEnd = self::baseEndForPlan($plan, $startsAt);
        $carryover = self::freeTrialCarryoverCalendarDays($store, $replacedActiveSubscription);

        return $carryover > 0 ? $baseEnd->copy()->addDays($carryover) : $baseEnd;
    }

    /**
     * Plan length only (no trial carryover).
     */
    public static function baseEndForPlan(SubscriptionPlan $plan, Carbon $startsAt): Carbon
    {
        if (isset($plan->duration_days) && (int) $plan->duration_days > 0) {
            return $startsAt->copy()->addDays((int) $plan->duration_days);
        }

        return (string) ($plan->billing_cycle ?? 'monthly') === 'yearly'
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonth();
    }

    public static function freeTrialCarryoverCalendarDays(Store $store, ?StoreSubscription $replaced): int
    {
        if (self::hasEverHadPaidSubscription($store)) {
            return 0;
        }

        if ($replaced !== null) {
            $replaced->loadMissing('plan');
            if ($replaced->plan && (int) $replaced->plan->price > 0) {
                return 0;
            }
        }

        return self::remainingFreeTrialCalendarDays($store);
    }

    /**
     * Whole calendar days from the start of "today" until the store's trial end date (exclusive of time-of-day),
     * using the computed {@see Store::$trial_ends_at} accessor (created_at + current platform free_trial_days).
     */
    public static function remainingFreeTrialCalendarDays(Store $store): int
    {
        $trialEnd = $store->trial_ends_at;
        if ($trialEnd === null) {
            return 0;
        }

        $today = now()->startOfDay();
        $endDay = $trialEnd->copy()->startOfDay();

        if ($endDay->lessThanOrEqualTo($today)) {
            return 0;
        }

        return (int) $today->diffInDays($endDay);
    }
}
