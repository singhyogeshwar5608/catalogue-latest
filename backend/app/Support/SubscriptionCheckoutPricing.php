<?php

namespace App\Support;

use App\Models\PlatformSetting;
use App\Models\SubscriptionPlan;

/**
 * Subscription checkout: gross (plan + add-ons), billing-term % off from platform_settings, then 18% GST on the net.
 * Mirrors the store dashboard subscription page.
 */
final class SubscriptionCheckoutPricing
{
    public const GST_PERCENT = 18;

    public static function billingDiscountPercentForPlan(SubscriptionPlan $plan): int
    {
        $discounts = PlatformSetting::subscriptionBillingDiscountsPayload();
        $tier = $plan->billing_discount_tier ?? null;
        if (is_string($tier) && $tier !== '') {
            if ($tier === 'one_month') {
                return max(0, min(100, (int) ($discounts['discount_1_month_pct'] ?? 0)));
            }
            if ($tier === 'three_months') {
                return max(0, min(100, (int) ($discounts['discount_3_months_pct'] ?? 0)));
            }
            if ($tier === 'one_year') {
                return max(0, min(100, (int) ($discounts['discount_1_year_pct'] ?? 0)));
            }
        }

        $rankPct = self::billingDiscountPercentFromPaidPlanPriceRank($plan, $discounts);
        if ($rankPct !== null) {
            return $rankPct;
        }

        return self::billingDiscountPercentForPlanWithDiscounts($plan, $discounts);
    }

    /**
     * When several short monthly plans share the same kind of term (e.g. all 30-day) but different prices,
     * map admin discount rows by price order among qualifying paid plans:
     * - Two plans: lowest → 1 month %, highest → 1 year % (typical entry + premium when there is no middle tier).
     * - Three or more: lowest → 1 month %, second → 3 months %, remaining → 1 year %.
     *
     * @param  array{discount_1_month_pct: int, discount_3_months_pct: int, discount_1_year_pct: int}  $discounts
     */
    private static function billingDiscountPercentFromPaidPlanPriceRank(SubscriptionPlan $plan, array $discounts): ?int
    {
        if ((int) $plan->price <= 0 || ! $plan->is_active) {
            return null;
        }

        if ((string) ($plan->billing_cycle ?? 'monthly') === 'yearly') {
            return null;
        }

        $d = (int) ($plan->duration_days ?? 0);
        if ($d > 45) {
            return null;
        }

        $rows = SubscriptionPlan::query()
            ->where('is_active', true)
            ->where('price', '>', 0)
            ->where(function ($q) {
                $q->where('billing_cycle', 'monthly')
                    ->orWhereNull('billing_cycle');
            })
            ->where(function ($q) {
                $q->whereNull('duration_days')
                    ->orWhere('duration_days', '<=', 45);
            })
            ->orderBy('price')
            ->orderBy('id')
            ->get(['id']);

        $n = $rows->count();
        if ($n < 2) {
            return null;
        }

        $planId = (int) $plan->id;
        $index = $rows->search(fn ($row) => (int) $row->id === $planId);
        if ($index === false) {
            return null;
        }

        if ($n === 2) {
            if ($index === 0) {
                return max(0, min(100, (int) ($discounts['discount_1_month_pct'] ?? 0)));
            }

            return max(0, min(100, (int) ($discounts['discount_1_year_pct'] ?? 0)));
        }

        if ($index === 0) {
            return max(0, min(100, (int) ($discounts['discount_1_month_pct'] ?? 0)));
        }
        if ($index === 1) {
            return max(0, min(100, (int) ($discounts['discount_3_months_pct'] ?? 0)));
        }

        return max(0, min(100, (int) ($discounts['discount_1_year_pct'] ?? 0)));
    }

    /**
     * When {@see SubscriptionPlan::$billing_discount_tier} is empty: infer from billing cycle + duration (days).
     *
     * @param  array{discount_1_month_pct: int, discount_3_months_pct: int, discount_1_year_pct: int}  $discounts
     */
    public static function billingDiscountPercentForPlanWithDiscounts(SubscriptionPlan $plan, array $discounts): int
    {
        $d = (int) ($plan->duration_days ?? 0);
        $cycle = (string) ($plan->billing_cycle ?? 'monthly');

        if ($cycle === 'yearly' || $d >= 330) {
            return max(0, min(100, (int) ($discounts['discount_1_year_pct'] ?? 0)));
        }

        if ($d >= 60 && $d < 330) {
            return max(0, min(100, (int) ($discounts['discount_3_months_pct'] ?? 0)));
        }

        return max(0, min(100, (int) ($discounts['discount_1_month_pct'] ?? 0)));
    }

    public static function discountRupeesFromGross(int $grossRupees, int $percent): int
    {
        if ($grossRupees <= 0 || $percent <= 0) {
            return 0;
        }

        return (int) round($grossRupees * $percent / 100);
    }

    public static function gstRupeesFromTaxableSubtotal(int $taxableRupees): int
    {
        return (int) round($taxableRupees * self::GST_PERCENT / 100);
    }

    /**
     * @param  array{payment_gateway: bool, qr_code: bool, payment_gateway_help: bool}  $addonsPayload
     */
    public static function grossSubtotalRupees(SubscriptionPlan $plan, array $addonsPayload): int
    {
        $base = (int) $plan->price;
        $charges = PlatformSetting::subscriptionAddonChargesPayload();
        $addonSum =
            ($addonsPayload['payment_gateway'] ? $charges['payment_gateway_integration_inr'] : 0)
            + ($addonsPayload['qr_code'] ? $charges['qr_code_inr'] : 0)
            + ($addonsPayload['payment_gateway_help'] ? $charges['payment_gateway_help_inr'] : 0);

        return $base + $addonSum;
    }

    /**
     * @param  array{payment_gateway: bool, qr_code: bool, payment_gateway_help: bool}  $addonsPayload
     */
    public static function checkoutTotalRupees(SubscriptionPlan $plan, array $addonsPayload): int
    {
        $gross = self::grossSubtotalRupees($plan, $addonsPayload);
        $pct = self::billingDiscountPercentForPlan($plan);
        $discountRupees = self::discountRupeesFromGross($gross, $pct);
        $net = max(0, $gross - $discountRupees);

        return $net + self::gstRupeesFromTaxableSubtotal($net);
    }
}
