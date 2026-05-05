<?php

namespace App\Support;

use App\Models\SubscriptionPlan;

/**
 * Product upload caps by subscription term (mirrors billing-term inference in {@see SubscriptionCheckoutPricing}).
 *
 * Free / trial (price 0): 10 products.
 * Paid — 1 month: 50 · 3 months: 100 · 1 year: unlimited.
 */
final class SubscriptionPlanProductLimit
{
    public const FREE_MAX = 10;

    public const ONE_MONTH_MAX = 50;

    public const THREE_MONTH_MAX = 100;

    /** Sentinel for unlimited catalog size (UI + API). */
    public const UNLIMITED = 999999;

    public static function resolve(SubscriptionPlan $plan): int
    {
        $attrs = $plan->getAttributes();
        $price = (int) ($attrs['price'] ?? 0);
        if ($price <= 0) {
            return self::FREE_MAX;
        }

        $tier = $attrs['billing_discount_tier'] ?? null;
        if (is_string($tier) && $tier !== '') {
            return match ($tier) {
                'one_month' => self::ONE_MONTH_MAX,
                'three_months' => self::THREE_MONTH_MAX,
                'one_year' => self::UNLIMITED,
                default => self::inferPaidMaxFromDurationAndCycle($plan),
            };
        }

        return self::inferPaidMaxFromDurationAndCycle($plan);
    }

    /**
     * Same duration bands as {@see SubscriptionCheckoutPricing::billingDiscountPercentForPlanWithDiscounts}.
     */
    private static function inferPaidMaxFromDurationAndCycle(SubscriptionPlan $plan): int
    {
        $d = (int) ($plan->getAttributes()['duration_days'] ?? 0);
        $cycle = (string) ($plan->getAttributes()['billing_cycle'] ?? 'monthly');

        if ($cycle === 'yearly' || $d >= 330) {
            return self::UNLIMITED;
        }

        if ($d >= 60 && $d < 330) {
            return self::THREE_MONTH_MAX;
        }

        return self::ONE_MONTH_MAX;
    }
}
